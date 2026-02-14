import db, { generateId } from './db';
import { userRepository, organizationRepository, folderRepository, userOrganizationRepository } from './repositories';

/**
 * Adds a user to an organization and creates their personal folder
 */
export async function addUserToOrganization(userId: string, organizationId: string, role: string = 'member') {
  await db.transaction(async () => {
    const user = await userRepository.getById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const org = await organizationRepository.getById(organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    if (await userOrganizationRepository.hasDuplicateName(user.name, organizationId, userId)) {
      throw new Error('A user with this name already exists in this organization');
    }

    await userOrganizationRepository.addUserToOrg(userId, organizationId, role);

    const folderId = generateId();
    await folderRepository.create(folderId, user.name, org.root_folder_id, organizationId);
  });
}

/**
 * Removes a user from an organization and deletes their personal folder
 */
export async function removeUserFromOrganization(userId: string, organizationId: string) {
  await db.transaction(async () => {
    const user = await userRepository.getById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const org = await organizationRepository.getById(organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    const userFolder = await folderRepository.findByNameAndParent(user.name, org.root_folder_id, organizationId);
    if (userFolder) {
      await folderRepository.deleteFolderRecursive(userFolder.id);
    }

    await userOrganizationRepository.removeUserFromOrg(userId, organizationId);
  });
}
