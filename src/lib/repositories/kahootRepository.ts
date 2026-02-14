import db from '../db';
import type { Kahoot } from '../schema';

export const kahootRepository = {
  async getById(id: string): Promise<Kahoot | undefined> {
    return db.getOne<Kahoot>('SELECT * FROM kahoots WHERE id = $1', id);
  },

  async getAll(): Promise<Kahoot[]> {
    return db.getAll<Kahoot>('SELECT * FROM kahoots');
  },

  async getByFolder(folderId: string): Promise<Kahoot[]> {
    return db.getAll<Kahoot>('SELECT * FROM kahoots WHERE folder_id = $1', folderId);
  },

  async create(id: string, name: string, folderId: string): Promise<void> {
    await db.run('INSERT INTO kahoots (id, name, folder_id) VALUES ($1, $2, $3)', id, name, folderId);
  },

  async update(id: string, name: string, folderId: string): Promise<boolean> {
    const info = await db.run('UPDATE kahoots SET name = $1, folder_id = $2 WHERE id = $3', name, folderId, id);
    return info.changes > 0;
  },

  async delete(id: string): Promise<void> {
    await db.run('DELETE FROM kahoots WHERE id = $1', id);
  },

  async deleteByFolder(folderId: string): Promise<void> {
    await db.run('DELETE FROM kahoots WHERE folder_id = $1', folderId);
  },

  async deleteByOrganization(orgId: string): Promise<void> {
    await db.run('DELETE FROM kahoots WHERE folder_id IN (SELECT id FROM folders WHERE organization_id = $1)', orgId);
  },
};
