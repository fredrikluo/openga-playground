import { writeTuples, deleteTuples } from './openfga';
import { getOne, getAll } from './db';
import type { Organization, Folder } from './schema';

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

export async function writeGroupTuples(
  groupId: string,
  orgId: string,
  memberIds: (string)[]
) {
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

export async function deleteGroupTuples(
  groupId: string,
  orgId: string,
  memberIds: (string)[]
) {
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

export async function syncGroupMembers(
  groupId: string,
  oldMemberIds: (string)[],
  newMemberIds: (string)[]
) {
  const oldSet = new Set(oldMemberIds.map(String));
  const newSet = new Set(newMemberIds.map(String));

  const toRemove = oldMemberIds.filter(id => !newSet.has(String(id)));
  const toAdd = newMemberIds.filter(id => !oldSet.has(String(id)));

  if (toRemove.length > 0) {
    await deleteTuples(
      toRemove.map(uid => ({
        user: `user:${uid}`,
        relation: 'member' as const,
        object: `group:${groupId}`,
      }))
    );
  }

  if (toAdd.length > 0) {
    await writeTuples(
      toAdd.map(uid => ({
        user: `user:${uid}`,
        relation: 'member' as const,
        object: `group:${groupId}`,
      }))
    );
  }
}

export async function writeFolderTuples(
  folderId: string,
  orgId: string,
  parentFolderId: string | null
) {
  const tuples = [
    { user: `organization:${orgId}`, relation: 'in_org', object: `folder:${folderId}` },
  ];
  if (parentFolderId !== null) {
    tuples.push({
      user: `folder:${parentFolderId}`,
      relation: 'parent',
      object: `folder:${folderId}`,
    });
  }
  await writeTuples(tuples);
}

export async function updateFolderParentTuple(
  folderId: string,
  oldParentId: string | null,
  newParentId: string | null
) {
  if (oldParentId !== null) {
    await deleteTuples([
      { user: `folder:${oldParentId}`, relation: 'parent', object: `folder:${folderId}` },
    ]);
  }
  if (newParentId !== null) {
    await writeTuples([
      { user: `folder:${newParentId}`, relation: 'parent', object: `folder:${folderId}` },
    ]);
  }
}

export async function writeDocumentTuples(
  kahootId: string,
  folderId: string,
  orgId: string
) {
  await writeTuples([
    { user: `folder:${folderId}`, relation: 'parent', object: `document:${kahootId}` },
    { user: `organization:${orgId}`, relation: 'in_org', object: `document:${kahootId}` },
  ]);
}

export async function updateDocumentParentTuple(
  kahootId: string,
  oldFolderId: string,
  newFolderId: string
) {
  await deleteTuples([
    { user: `folder:${oldFolderId}`, relation: 'parent', object: `document:${kahootId}` },
  ]);
  await writeTuples([
    { user: `folder:${newFolderId}`, relation: 'parent', object: `document:${kahootId}` },
  ]);
}

export async function deleteDocumentTuples(
  kahootId: string,
  folderId: string,
  orgId: string
) {
  await deleteTuples([
    { user: `folder:${folderId}`, relation: 'parent', object: `document:${kahootId}` },
    { user: `organization:${orgId}`, relation: 'in_org', object: `document:${kahootId}` },
  ]);
}

// ============================================================
// High-level sync functions (called from API routes)
// These encapsulate DB lookups so routes stay clean.
// ============================================================

/**
 * After creating an organization: sync org membership, root folder, and all child folders.
 */
export async function syncOrgCreated(
  orgId: string,
  rootFolderId: string,
  creatorUserId: string
) {
  await writeOrgMemberTuple(creatorUserId, orgId);
  await writeFolderTuples(rootFolderId, orgId, null);
  const childFolders = getAll<Folder>(
    'SELECT * FROM folders WHERE parent_folder_id = ? AND organization_id = ?',
    rootFolderId, orgId
  );
  for (const folder of childFolders) {
    await writeFolderTuples(folder.id, orgId, rootFolderId);
  }
}

/**
 * After deleting an organization: clean up org membership tuples.
 */
export async function syncOrgDeleted(
  orgId: string,
  memberUserIds: string[]
) {
  for (const userId of memberUserIds) {
    await deleteOrgMemberTuple(userId, orgId);
  }
}

/**
 * After adding a user to an existing organization: sync org membership + personal folder.
 */
export async function syncUserAddedToOrg(
  userId: string,
  orgId: string,
  userName: string
) {
  await writeOrgMemberTuple(userId, orgId);
  const org = getOne<Organization>('SELECT root_folder_id FROM organizations WHERE id = ?', orgId);
  if (org) {
    const personalFolder = getOne<Folder>(
      'SELECT * FROM folders WHERE name = ? AND parent_folder_id = ? AND organization_id = ?',
      userName, org.root_folder_id, orgId
    );
    if (personalFolder) {
      await writeFolderTuples(personalFolder.id, orgId, org.root_folder_id);
    }
  }
}

/**
 * After removing a user from an organization: delete org membership tuple.
 */
export async function syncUserRemovedFromOrg(
  userId: string,
  orgId: string
) {
  await deleteOrgMemberTuple(userId, orgId);
}

/**
 * After creating a kahoot: sync document tuples (looks up org from folder).
 */
export async function syncKahootCreated(
  kahootId: string,
  folderId: string
) {
  const folder = getOne<Folder>('SELECT organization_id FROM folders WHERE id = ?', folderId);
  if (folder) {
    await writeDocumentTuples(kahootId, folderId, folder.organization_id);
  }
}

/**
 * After updating a kahoot's folder: sync parent tuple if folder changed.
 */
export async function syncKahootUpdated(
  kahootId: string,
  oldFolderId: string,
  newFolderId: string
) {
  if (oldFolderId !== newFolderId) {
    await updateDocumentParentTuple(kahootId, oldFolderId, newFolderId);
  }
}

/**
 * After deleting a kahoot: clean up document tuples (looks up org from folder).
 */
export async function syncKahootDeleted(
  kahootId: string,
  folderId: string
) {
  const folder = getOne<Folder>('SELECT organization_id FROM folders WHERE id = ?', folderId);
  if (folder) {
    await deleteDocumentTuples(kahootId, folderId, folder.organization_id);
  }
}

/**
 * After updating a folder's parent: sync parent tuple if it changed.
 */
export async function syncFolderMoved(
  folderId: string,
  oldParentId: string | null,
  newParentId: string | null
) {
  if (oldParentId !== newParentId) {
    await updateFolderParentTuple(folderId, oldParentId, newParentId);
  }
}
