import db from '../db';
import type { Kahoot } from '../schema';

export const kahootRepository = {
  async getById(id: string): Promise<Kahoot | undefined> {
    return db.getOne<Kahoot>('SELECT * FROM kahoots WHERE id = ?', id);
  },

  async getAll(): Promise<Kahoot[]> {
    return db.getAll<Kahoot>('SELECT * FROM kahoots');
  },

  async getByFolder(folderId: string): Promise<Kahoot[]> {
    return db.getAll<Kahoot>('SELECT * FROM kahoots WHERE folder_id = ?', folderId);
  },

  async create(id: string, name: string, folderId: string): Promise<void> {
    await db.run('INSERT INTO kahoots (id, name, folder_id) VALUES (?, ?, ?)', id, name, folderId);
  },

  async update(id: string, name: string, folderId: string): Promise<boolean> {
    const info = await db.run('UPDATE kahoots SET name = ?, folder_id = ? WHERE id = ?', name, folderId, id);
    return info.changes > 0;
  },

  async delete(id: string): Promise<void> {
    await db.run('DELETE FROM kahoots WHERE id = ?', id);
  },

  async deleteByFolder(folderId: string): Promise<void> {
    await db.run('DELETE FROM kahoots WHERE folder_id = ?', folderId);
  },

  async deleteByOrganization(orgId: string): Promise<void> {
    await db.run('DELETE FROM kahoots WHERE folder_id IN (SELECT id FROM folders WHERE organization_id = ?)', orgId);
  },
};
