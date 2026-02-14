import { writeTuples, deleteTuples } from './openfga';

// === ORGANIZATION TUPLES ===

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

// === GROUP TUPLES ===

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

// === FOLDER TUPLES ===

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

// === DOCUMENT (KAHOOT) TUPLES ===

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
