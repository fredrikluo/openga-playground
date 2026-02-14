import db, { getOne, generateId } from './db';
import type { User } from './schema';

/**
 * Adds a user to an organization and creates their personal folder
 */
export function addUserToOrganization(userId: string, organizationId: string, role: string = 'member') {
  const transaction = db.transaction(() => {
    const user = getOne<User>('SELECT name FROM users WHERE id = ?', userId);
    if (!user) {
      throw new Error('User not found');
    }

    const org = getOne<{ root_folder_id: string }>('SELECT root_folder_id FROM organizations WHERE id = ?', organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    const existingUser = getOne<{ id: string }>(`
      SELECT u.id FROM users u
      JOIN user_organizations uo ON u.id = uo.user_id
      WHERE u.name = ? AND uo.organization_id = ? AND u.id != ?
    `, user.name, organizationId, userId);

    if (existingUser) {
      throw new Error('A user with this name already exists in this organization');
    }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO user_organizations (user_id, organization_id, role)
      VALUES (?, ?, ?)
    `);
    stmt.run(userId, organizationId, role);

    const folderId = generateId();
    const folderStmt = db.prepare('INSERT INTO folders (id, name, parent_folder_id, organization_id) VALUES (?, ?, ?, ?)');
    folderStmt.run(folderId, user.name, org.root_folder_id, organizationId);
  });

  transaction();
}

/**
 * Removes a user from an organization and deletes their personal folder
 */
export function removeUserFromOrganization(userId: string, organizationId: string) {
  const transaction = db.transaction(() => {
    const user = getOne<User>('SELECT name FROM users WHERE id = ?', userId);
    if (!user) {
      throw new Error('User not found');
    }

    const org = getOne<{ root_folder_id: string }>('SELECT root_folder_id FROM organizations WHERE id = ?', organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    const userFolder = getOne<{ id: string }>(`
      SELECT id FROM folders
      WHERE name = ? AND parent_folder_id = ? AND organization_id = ?
    `, user.name, org.root_folder_id, organizationId);

    if (userFolder) {
      const deleteFolderRecursive = (folderId: string) => {
        const subfolders = db.prepare('SELECT id FROM folders WHERE parent_folder_id = ?').all(folderId) as { id: string }[];
        for (const subfolder of subfolders) {
          deleteFolderRecursive(subfolder.id);
        }
        db.prepare('DELETE FROM kahoots WHERE folder_id = ?').run(folderId);
        db.prepare('DELETE FROM folders WHERE id = ?').run(folderId);
      };
      deleteFolderRecursive(userFolder.id);
    }

    const stmt = db.prepare(`
      DELETE FROM user_organizations
      WHERE user_id = ? AND organization_id = ?
    `);
    stmt.run(userId, organizationId);
  });

  transaction();
}
