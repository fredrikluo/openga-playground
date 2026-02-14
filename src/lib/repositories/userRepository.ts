import db from '../db';
import type { User } from '../schema';

export const userRepository = {
  async getById(id: string): Promise<User | undefined> {
    return db.getOne<User>('SELECT * FROM users WHERE id = $1', id);
  },

  async getAll(): Promise<User[]> {
    return db.getAll<User>('SELECT * FROM users ORDER BY name');
  },

  async getByOrganization(orgId: string): Promise<(User & { role: string })[]> {
    return db.getAll<User & { role: string }>(`
      SELECT DISTINCT u.id, u.name, u.email, uo.role
      FROM users u
      JOIN user_organizations uo ON u.id = uo.user_id
      WHERE uo.organization_id = $1
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
    await db.run('INSERT INTO users (id, name, email) VALUES ($1, $2, $3)', id, name, email);
  },

  async update(id: string, name: string, email: string): Promise<boolean> {
    const info = await db.run('UPDATE users SET name = $1, email = $2 WHERE id = $3', name, email, id);
    return info.changes > 0;
  },

  async delete(id: string): Promise<void> {
    await db.run('DELETE FROM users WHERE id = $1', id);
  },
};
