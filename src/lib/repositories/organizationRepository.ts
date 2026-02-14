import db from '../db';
import type { Organization } from '../schema';

export const organizationRepository = {
  async getById(id: string): Promise<Organization | undefined> {
    return db.getOne<Organization>('SELECT * FROM organizations WHERE id = $1', id);
  },

  async getAll(): Promise<Organization[]> {
    return db.getAll<Organization>('SELECT * FROM organizations ORDER BY name');
  },

  async getByUser(userId: string): Promise<Organization[]> {
    return db.getAll<Organization>(`
      SELECT o.* FROM organizations o
      JOIN user_organizations uo ON o.id = uo.organization_id
      WHERE uo.user_id = $1
      ORDER BY o.name
    `, userId);
  },

  async getByUserWithRole(userId: string): Promise<(Organization & { role: string })[]> {
    return db.getAll<Organization & { role: string }>(`
      SELECT o.id, o.name, o.root_folder_id, uo.role
      FROM organizations o
      JOIN user_organizations uo ON o.id = uo.organization_id
      WHERE uo.user_id = $1
      ORDER BY o.name
    `, userId);
  },

  async create(id: string, name: string, rootFolderId: string): Promise<void> {
    await db.run('INSERT INTO organizations (id, name, root_folder_id) VALUES ($1, $2, $3)', id, name, rootFolderId);
  },

  async updateName(id: string, name: string): Promise<boolean> {
    const info = await db.run('UPDATE organizations SET name = $1 WHERE id = $2', name, id);
    return info.changes > 0;
  },

  async clearRootFolder(id: string): Promise<void> {
    await db.run('UPDATE organizations SET root_folder_id = NULL WHERE id = $1', id);
  },

  async delete(id: string): Promise<void> {
    await db.run('DELETE FROM organizations WHERE id = $1', id);
  },
};
