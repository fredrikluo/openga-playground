import db from '../db';
import type { User } from '../schema';

export const userRepository = {
  async getById(id: string): Promise<User | undefined> {
    return db.getOne<User>('SELECT * FROM users WHERE id = ?', id);
  },

  async getAll(): Promise<User[]> {
    return db.getAll<User>('SELECT * FROM users ORDER BY name');
  },

  async getByOrganization(orgId: string): Promise<User[]> {
    return db.getAll<User>(`
      SELECT DISTINCT u.id, u.name, u.email
      FROM users u
      JOIN user_organizations uo ON u.id = uo.user_id
      WHERE uo.organization_id = ?
      ORDER BY u.name
    `, orgId);
  },

  async getUnassigned(): Promise<User[]> {
    return db.getAll<User>(`
      SELECT DISTINCT u.* FROM users u
      LEFT JOIN user_organizations uo ON u.id = uo.user_id
      WHERE uo.user_id IS NULL
    `);
  },

  async create(id: string, name: string, email: string): Promise<void> {
    await db.run('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', id, name, email);
  },

  async update(id: string, name: string, email: string): Promise<boolean> {
    const info = await db.run('UPDATE users SET name = ?, email = ? WHERE id = ?', name, email, id);
    return info.changes > 0;
  },

  async delete(id: string): Promise<void> {
    await db.run('DELETE FROM users WHERE id = ?', id);
  },
};
