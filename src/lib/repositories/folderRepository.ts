import db from '../db';
import type { Folder } from '../schema';

export const folderRepository = {
  async getById(id: string): Promise<Folder | undefined> {
    return db.getOne<Folder>('SELECT * FROM folders WHERE id = ?', id);
  },

  async getByOrganization(orgId: string): Promise<Folder[]> {
    return db.getAll<Folder>('SELECT * FROM folders WHERE organization_id = ?', orgId);
  },

  async getSubfolders(parentId: string): Promise<Folder[]> {
    return db.getAll<Folder>('SELECT * FROM folders WHERE parent_folder_id = ?', parentId);
  },

  async getSubfolderIds(parentId: string): Promise<string[]> {
    const rows = await db.getAll<{ id: string }>('SELECT id FROM folders WHERE parent_folder_id = ?', parentId);
    return rows.map(r => r.id);
  },

  async getChildFolders(parentId: string, orgId: string): Promise<Folder[]> {
    return db.getAll<Folder>(
      'SELECT * FROM folders WHERE parent_folder_id = ? AND organization_id = ?',
      parentId, orgId
    );
  },

  async findByNameAndParent(name: string, parentId: string, orgId: string): Promise<Folder | undefined> {
    return db.getOne<Folder>(
      'SELECT * FROM folders WHERE name = ? AND parent_folder_id = ? AND organization_id = ?',
      name, parentId, orgId
    );
  },

  async create(id: string, name: string, parentId: string | null, orgId: string | null): Promise<void> {
    await db.run('INSERT INTO folders (id, name, parent_folder_id, organization_id) VALUES (?, ?, ?, ?)', id, name, parentId, orgId);
  },

  async update(id: string, name: string, parentId: string | null): Promise<boolean> {
    const info = await db.run('UPDATE folders SET name = ?, parent_folder_id = ? WHERE id = ?', name, parentId, id);
    return info.changes > 0;
  },

  async setOrganization(id: string, orgId: string): Promise<void> {
    await db.run('UPDATE folders SET organization_id = ? WHERE id = ?', orgId, id);
  },

  async delete(id: string): Promise<void> {
    await db.run('DELETE FROM folders WHERE id = ?', id);
  },

  async deleteByOrganization(orgId: string): Promise<void> {
    await db.run('DELETE FROM folders WHERE organization_id = ?', orgId);
  },

  async deleteFolderRecursive(folderId: string): Promise<void> {
    const subfolderIds = await folderRepository.getSubfolderIds(folderId);
    for (const subId of subfolderIds) {
      await folderRepository.deleteFolderRecursive(subId);
    }
    await db.run('DELETE FROM kahoots WHERE folder_id = ?', folderId);
    await db.run('DELETE FROM folders WHERE id = ?', folderId);
  },
};
