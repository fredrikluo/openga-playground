import { writeTuples, deleteTuples, readTuples } from './openfga';
import { organizationRepository, folderRepository, kahootRepository } from './repositories';

// ============================================================
// Low-level tuple helpers
// ============================================================

export async function writeOrgMemberTuple(userId: string, orgId: string) {
  await writeTuples([
    { user: `user:${userId}`, relation: 'member', object: `organization:${orgId}` },
  ]);
}

export async function deleteOrgMemberTuple(userId: string, orgId: string) {
  await deleteTuples([
    { user: `user:${userId}`, relation: 'member', object: `organization:${orgId}` },
  ]);
}

export async function writeGroupTuples(groupId: string, orgId: string, memberIds: string[]) {
  const tuples = [
    { user: `organization:${orgId}`, relation: 'in_org', object: `group:${groupId}` },
    ...memberIds.map(uid => ({
      user: `user:${uid}`,
      relation: 'member' as const,
      object: `group:${groupId}`,
    })),
  ];
  await writeTuples(tuples);
}

export async function deleteGroupTuples(groupId: string, orgId: string, memberIds: string[]) {
  const tuples = [
    { user: `organization:${orgId}`, relation: 'in_org', object: `group:${groupId}` },
    ...memberIds.map(uid => ({
      user: `user:${uid}`,
      relation: 'member' as const,
      object: `group:${groupId}`,
    })),
  ];
  await deleteTuples(tuples);
}

export async function syncGroupMembers(groupId: string, oldMemberIds: string[], newMemberIds: string[]) {
  const oldSet = new Set(oldMemberIds);
  const newSet = new Set(newMemberIds);

  const toRemove = oldMemberIds.filter(id => !newSet.has(id));
  const toAdd = newMemberIds.filter(id => !oldSet.has(id));

  if (toRemove.length > 0) {
    await deleteTuples(
      toRemove.map(uid => ({ user: `user:${uid}`, relation: 'member' as const, object: `group:${groupId}` }))
    );
  }
  if (toAdd.length > 0) {
    await writeTuples(
      toAdd.map(uid => ({ user: `user:${uid}`, relation: 'member' as const, object: `group:${groupId}` }))
    );
  }
}

export async function writeFolderTuples(folderId: string, orgId: string, parentFolderId: string | null) {
  const tuples = [
    { user: `organization:${orgId}`, relation: 'in_org', object: `folder:${folderId}` },
  ];
  if (parentFolderId !== null) {
    tuples.push({ user: `folder:${parentFolderId}`, relation: 'parent', object: `folder:${folderId}` });
  }
  await writeTuples(tuples);
}

export async function updateFolderParentTuple(folderId: string, oldParentId: string | null, newParentId: string | null) {
  if (oldParentId !== null) {
    await deleteTuples([{ user: `folder:${oldParentId}`, relation: 'parent', object: `folder:${folderId}` }]);
  }
  if (newParentId !== null) {
    await writeTuples([{ user: `folder:${newParentId}`, relation: 'parent', object: `folder:${folderId}` }]);
  }
}

export async function writeDocumentTuples(kahootId: string, folderId: string, orgId: string) {
  await writeTuples([
    { user: `folder:${folderId}`, relation: 'parent', object: `document:${kahootId}` },
    { user: `organization:${orgId}`, relation: 'in_org', object: `document:${kahootId}` },
  ]);
}

export async function updateDocumentParentTuple(kahootId: string, oldFolderId: string, newFolderId: string) {
  await deleteTuples([{ user: `folder:${oldFolderId}`, relation: 'parent', object: `document:${kahootId}` }]);
  await writeTuples([{ user: `folder:${newFolderId}`, relation: 'parent', object: `document:${kahootId}` }]);
}

export async function deleteDocumentTuples(kahootId: string, folderId: string, orgId: string) {
  await deleteTuples([
    { user: `folder:${folderId}`, relation: 'parent', object: `document:${kahootId}` },
    { user: `organization:${orgId}`, relation: 'in_org', object: `document:${kahootId}` },
  ]);
}

// ============================================================
// High-level sync functions (called from API routes)
// ============================================================

/**
 * After creating an org: write structural folder tuples + org-wide creator role on shared folder.
 * Does NOT write user-level tuples — call syncUserAddedToOrg separately for the creator.
 */
export async function syncOrgCreated(orgId: string, rootFolderId: string) {
  await writeFolderTuples(rootFolderId, orgId, null);
  const childFolders = await folderRepository.getChildFolders(rootFolderId, orgId);
  for (const folder of childFolders) {
    await writeFolderTuples(folder.id, orgId, rootFolderId);
  }
  // All org members are viewers + creators on the shared folder
  const sharedFolder = await folderRepository.getSharedFolder(rootFolderId, orgId);
  if (sharedFolder) {
    await writeTuples([
      { user: `organization:${orgId}#member`, relation: 'viewer', object: `folder:${sharedFolder.id}` },
      { user: `organization:${orgId}#member`, relation: 'creator', object: `folder:${sharedFolder.id}` },
    ]);
  }
}

export async function syncOrgDeleted(orgId: string, memberUserIds: string[]) {
  for (const userId of memberUserIds) {
    await deleteOrgMemberTuple(userId, orgId);
  }
}

/**
 * When a user is added to an org: write org member, personal folder tuples,
 * creator role on shared folder, and admin/manager role if applicable.
 */
export async function syncUserAddedToOrg(userId: string, orgId: string, userName: string, role: string) {
  await writeOrgMemberTuple(userId, orgId);
  const org = await organizationRepository.getById(orgId);
  if (org) {
    // Personal folder: structural tuples + user is manager
    const personalFolder = await folderRepository.findByNameAndParent(userName, org.root_folder_id, orgId);
    if (personalFolder) {
      await writeFolderTuples(personalFolder.id, orgId, org.root_folder_id);
      await writeTuples([
        { user: `user:${userId}`, relation: 'manager', object: `folder:${personalFolder.id}` },
      ]);
    }
    // Admin/coadmin → manager on root folder
    await syncAdminRole(userId, orgId, role);
  }
}

export async function syncUserRemovedFromOrg(userId: string, orgId: string) {
  await deleteOrgMemberTuple(userId, orgId);
}

/**
 * If role is admin/coadmin, grant manager on root folder. Otherwise remove it.
 */
export async function syncAdminRole(userId: string, orgId: string, role: string) {
  const org = await organizationRepository.getById(orgId);
  if (!org) return;

  if (role === 'admin' || role === 'coadmin') {
    await writeTuples([
      { user: `user:${userId}`, relation: 'manager', object: `folder:${org.root_folder_id}` },
    ]);
  } else {
    await deleteTuples([
      { user: `user:${userId}`, relation: 'manager', object: `folder:${org.root_folder_id}` },
    ]);
  }
}

/**
 * After creating a folder: write folder tuples + assign creator as manager.
 */
export async function syncFolderCreated(folderId: string, orgId: string, parentFolderId: string | null, creatorUserId: string) {
  await writeFolderTuples(folderId, orgId, parentFolderId);
  await writeTuples([
    { user: `user:${creatorUserId}`, relation: 'manager', object: `folder:${folderId}` },
  ]);
}

/**
 * After creating a kahoot: write document tuples + assign creator as manager.
 */
export async function syncKahootCreated(kahootId: string, folderId: string, creatorUserId: string) {
  const folder = await folderRepository.getById(folderId);
  if (folder) {
    await writeDocumentTuples(kahootId, folderId, folder.organization_id);
    await writeTuples([
      { user: `user:${creatorUserId}`, relation: 'manager', object: `document:${kahootId}` },
    ]);
  }
}

export async function syncKahootUpdated(kahootId: string, oldFolderId: string, newFolderId: string) {
  if (oldFolderId !== newFolderId) {
    await updateDocumentParentTuple(kahootId, oldFolderId, newFolderId);
  }
}

export async function syncKahootDeleted(kahootId: string) {
  await deleteAllTuplesForObject(`document:${kahootId}`);
}

export async function syncFolderMoved(folderId: string, oldParentId: string | null, newParentId: string | null) {
  if (oldParentId !== newParentId) {
    await updateFolderParentTuple(folderId, oldParentId, newParentId);
  }
}

/**
 * Delete ALL FGA tuples for a given object (folder or document).
 * Reads all tuples where the object matches, then deletes them.
 */
async function deleteAllTuplesForObject(object: string) {
  const tuples = await readTuples({ object });
  if (tuples.length > 0) {
    await deleteTuples(
      tuples.map(t => ({
        user: t.key!.user,
        relation: t.key!.relation,
        object: t.key!.object,
      }))
    );
  }
}

/**
 * Before deleting a folder recursively: clean up all FGA tuples for the folder,
 * its subfolders, and all kahoots inside. Call this BEFORE the DB delete.
 */
export async function syncFolderDeletedRecursive(folderId: string) {
  // Recurse into subfolders first
  const subfolderIds = await folderRepository.getSubfolderIds(folderId);
  for (const subId of subfolderIds) {
    await syncFolderDeletedRecursive(subId);
  }

  // Delete tuples for all kahoots in this folder
  const kahoots = await kahootRepository.getByFolder(folderId);
  for (const kahoot of kahoots) {
    await deleteAllTuplesForObject(`document:${kahoot.id}`);
  }

  // Delete tuples for the folder itself
  await deleteAllTuplesForObject(`folder:${folderId}`);
}
