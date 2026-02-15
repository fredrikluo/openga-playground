import { check, readTuples } from './openfga';
import { folderRepository, kahootRepository } from './repositories';
import { userOrganizationRepository } from './repositories';

/**
 * Policy hub — runs FGA check then applies all policy layers.
 * Add new policies here as additional checks.
 */
export async function checkWithPolicy(
  user: string,
  relation: string,
  object: string
): Promise<boolean> {
  // FGA check first — policy never grants MORE than FGA
  const fgaResult = await check(user, relation, object);
  if (!fgaResult) return false;

  // Only apply user-level policies (not group: or organization:)
  if (!user.startsWith('user:')) return fgaResult;

  const userId = user.replace('user:', '');

  // Policy: limited member restrictions
  const limitedResult = await checkLimitedMemberPolicy(userId, relation, object);
  if (!limitedResult) return false;

  // Future policies go here:
  // const nextResult = await checkSomeOtherPolicy(userId, relation, object);
  // if (!nextResult) return false;

  return true;
}

/**
 * Limited member policy:
 *   1. Owned items (creator_id === userId) → allowed
 *   2. Directly shared items (explicit user tuple) → view only
 *   3. Indirectly shared (org/group, no direct tuple) → denied
 *
 * Non-limited-member users always pass.
 */
async function checkLimitedMemberPolicy(
  userId: string,
  relation: string,
  object: string
): Promise<boolean> {
  const role = await getUserRoleForObject(userId, object);
  if (role !== 'limited member') return true;

  // Owner → no override
  const creatorId = await getItemCreatorId(object);
  if (creatorId === userId) return true;

  // Direct user tuple → view only
  const directTuples = await readTuples({ user: `user:${userId}`, object });
  if (directTuples.length > 0) {
    return relation === 'can_view_effective';
  }

  // No direct tuple (org/group-based) → deny all
  return false;
}

async function getUserRoleForObject(userId: string, object: string): Promise<string | null> {
  const [type, id] = object.split(':');
  if (!id) return null;

  let orgId: string | null = null;

  if (type === 'folder') {
    const folder = await folderRepository.getById(id);
    orgId = folder?.organization_id ?? null;
  } else if (type === 'document') {
    const kahoot = await kahootRepository.getById(id);
    if (kahoot) {
      const folder = await folderRepository.getById(kahoot.folder_id);
      orgId = folder?.organization_id ?? null;
    }
  }

  if (!orgId) return null;
  return userOrganizationRepository.getRole(userId, orgId);
}

async function getItemCreatorId(object: string): Promise<string | null> {
  const [type, id] = object.split(':');
  if (!id) return null;

  if (type === 'folder') {
    const folder = await folderRepository.getById(id);
    return folder?.creator_id ?? null;
  } else if (type === 'document') {
    const kahoot = await kahootRepository.getById(id);
    return kahoot?.creator_id ?? null;
  }

  return null;
}
