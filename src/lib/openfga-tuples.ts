import { writeTuples, deleteTuples } from './openfga';
import { organizationRepository, folderRepository } from './repositories';

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

export async function syncOrgCreated(orgId: string, rootFolderId: string, creatorUserId: string) {
  await writeOrgMemberTuple(creatorUserId, orgId);
  await writeFolderTuples(rootFolderId, orgId, null);
  const childFolders = await folderRepository.getChildFolders(rootFolderId, orgId);
  for (const folder of childFolders) {
    await writeFolderTuples(folder.id, orgId, rootFolderId);
  }
}

export async function syncOrgDeleted(orgId: string, memberUserIds: string[]) {
  for (const userId of memberUserIds) {
    await deleteOrgMemberTuple(userId, orgId);
  }
}

export async function syncUserAddedToOrg(userId: string, orgId: string, userName: string) {
  await writeOrgMemberTuple(userId, orgId);
  const org = await organizationRepository.getById(orgId);
  if (org) {
    const personalFolder = await folderRepository.findByNameAndParent(userName, org.root_folder_id, orgId);
    if (personalFolder) {
      await writeFolderTuples(personalFolder.id, orgId, org.root_folder_id);
    }
  }
}

export async function syncUserRemovedFromOrg(userId: string, orgId: string) {
  await deleteOrgMemberTuple(userId, orgId);
}

export async function syncKahootCreated(kahootId: string, folderId: string) {
  const folder = await folderRepository.getById(folderId);
  if (folder) {
    await writeDocumentTuples(kahootId, folderId, folder.organization_id);
  }
}

export async function syncKahootUpdated(kahootId: string, oldFolderId: string, newFolderId: string) {
  if (oldFolderId !== newFolderId) {
    await updateDocumentParentTuple(kahootId, oldFolderId, newFolderId);
  }
}

export async function syncKahootDeleted(kahootId: string, folderId: string) {
  const folder = await folderRepository.getById(folderId);
  if (folder) {
    await deleteDocumentTuples(kahootId, folderId, folder.organization_id);
  }
}

export async function syncFolderMoved(folderId: string, oldParentId: string | null, newParentId: string | null) {
  if (oldParentId !== newParentId) {
    await updateFolderParentTuple(folderId, oldParentId, newParentId);
  }
}
