import { writeTuples, deleteTuples } from './openfga';
import { getOne, getAll } from './db';
import type { Organization, Folder } from './schema';

// ============================================================
// Low-level tuple helpers
// ============================================================

export async function writeOrgMemberTuple(userId: number | bigint, orgId: number | bigint) {
  await writeTuples([
    { user: `user:${userId}`, relation: 'member', object: `organization:${orgId}` },
  ]);
}

export async function deleteOrgMemberTuple(userId: number | bigint, orgId: number | bigint) {
  await deleteTuples([
    { user: `user:${userId}`, relation: 'member', object: `organization:${orgId}` },
  ]);
}

export async function writeGroupTuples(
  groupId: number | bigint,
  orgId: number | bigint,
  memberIds: (number | bigint)[]
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
  groupId: number | bigint,
  orgId: number | bigint,
  memberIds: (number | bigint)[]
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
  groupId: number | bigint,
  oldMemberIds: (number | bigint)[],
  newMemberIds: (number | bigint)[]
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
  folderId: number | bigint,
  orgId: number | bigint,
  parentFolderId: number | bigint | null
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
  folderId: number | bigint,
  oldParentId: number | bigint | null,
  newParentId: number | bigint | null
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
  kahootId: number | bigint,
  folderId: number | bigint,
  orgId: number | bigint
) {
  await writeTuples([
    { user: `folder:${folderId}`, relation: 'parent', object: `document:${kahootId}` },
    { user: `organization:${orgId}`, relation: 'in_org', object: `document:${kahootId}` },
  ]);
}

export async function updateDocumentParentTuple(
  kahootId: number | bigint,
  oldFolderId: number | bigint,
  newFolderId: number | bigint
) {
  await deleteTuples([
    { user: `folder:${oldFolderId}`, relation: 'parent', object: `document:${kahootId}` },
  ]);
  await writeTuples([
    { user: `folder:${newFolderId}`, relation: 'parent', object: `document:${kahootId}` },
  ]);
}

export async function deleteDocumentTuples(
  kahootId: number | bigint,
  folderId: number | bigint,
  orgId: number | bigint
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
  orgId: number | bigint,
  rootFolderId: number | bigint,
  creatorUserId: number | bigint
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
  orgId: number | bigint,
  memberUserIds: number[]
) {
  for (const userId of memberUserIds) {
    await deleteOrgMemberTuple(userId, orgId);
  }
}

/**
 * After adding a user to an existing organization: sync org membership + personal folder.
 */
export async function syncUserAddedToOrg(
  userId: number | bigint,
  orgId: number | bigint,
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
  userId: number | bigint,
  orgId: number | bigint
) {
  await deleteOrgMemberTuple(userId, orgId);
}

/**
 * After creating a kahoot: sync document tuples (looks up org from folder).
 */
export async function syncKahootCreated(
  kahootId: number | bigint,
  folderId: number | bigint
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
  kahootId: number | bigint,
  oldFolderId: number | bigint,
  newFolderId: number | bigint
) {
  if (oldFolderId !== newFolderId) {
    await updateDocumentParentTuple(kahootId, oldFolderId, newFolderId);
  }
}

/**
 * After deleting a kahoot: clean up document tuples (looks up org from folder).
 */
export async function syncKahootDeleted(
  kahootId: number | bigint,
  folderId: number | bigint
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
  folderId: number | bigint,
  oldParentId: number | bigint | null,
  newParentId: number | bigint | null
) {
  if (oldParentId !== newParentId) {
    await updateFolderParentTuple(folderId, oldParentId, newParentId);
  }
}
