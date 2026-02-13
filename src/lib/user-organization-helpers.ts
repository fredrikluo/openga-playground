import db, { getOne } from './db';
import type { User } from './schema';

/**
 * Adds a user to an organization and creates their personal folder
 */
export function addUserToOrganization(userId: number | bigint, organizationId: number | bigint, role: string = 'member') {
  const transaction = db.transaction(() => {
    // Get user's name
    const user = getOne<User>('SELECT name FROM users WHERE id = ?', userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get organization's hidden root folder
    const org = getOne<{ root_folder_id: number }>('SELECT root_folder_id FROM organizations WHERE id = ?', organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    // Check if a user with the same name already exists in this organization
    const existingUser = getOne<{ id: number }>(`
      SELECT u.id FROM users u
      JOIN user_organizations uo ON u.id = uo.user_id
      WHERE u.name = ? AND uo.organization_id = ? AND u.id != ?
    `, user.name, organizationId, userId);

    if (existingUser) {
      throw new Error('A user with this name already exists in this organization');
    }

    // Add user to organization
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO user_organizations (user_id, organization_id, role)
      VALUES (?, ?, ?)
    `);
    stmt.run(userId, organizationId, role);

    // Create user's personal folder under the hidden root folder (same level as shared folder)
    const folderStmt = db.prepare('INSERT INTO folders (name, parent_folder_id, organization_id) VALUES (?, ?, ?)');
    folderStmt.run(user.name, org.root_folder_id, organizationId);
  });

  transaction();
}

/**
 * Removes a user from an organization and deletes their personal folder
 */
export function removeUserFromOrganization(userId: number | bigint, organizationId: number | bigint) {
  const transaction = db.transaction(() => {
    // Get user's name
    const user = getOne<User>('SELECT name FROM users WHERE id = ?', userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get organization's hidden root folder
    const org = getOne<{ root_folder_id: number }>('SELECT root_folder_id FROM organizations WHERE id = ?', organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    // Delete user's personal folder and all its contents (under the hidden root folder)
    const userFolder = getOne<{ id: number }>(`
      SELECT id FROM folders
      WHERE name = ? AND parent_folder_id = ? AND organization_id = ?
    `, user.name, org.root_folder_id, organizationId);

    if (userFolder) {
      // Recursively delete folder and its contents
      const deleteFolderRecursive = (folderId: number) => {
        // Get subfolders
        const subfolders = db.prepare('SELECT id FROM folders WHERE parent_folder_id = ?').all(folderId) as { id: number }[];
        for (const subfolder of subfolders) {
          deleteFolderRecursive(subfolder.id);
        }
        // Delete kahoots in this folder
        db.prepare('DELETE FROM kahoots WHERE folder_id = ?').run(folderId);
        // Delete the folder itself
        db.prepare('DELETE FROM folders WHERE id = ?').run(folderId);
      };
      deleteFolderRecursive(userFolder.id);
    }

    // Remove user from organization
    const stmt = db.prepare(`
      DELETE FROM user_organizations
      WHERE user_id = ? AND organization_id = ?
    `);
    stmt.run(userId, organizationId);
  });

  transaction();
}
