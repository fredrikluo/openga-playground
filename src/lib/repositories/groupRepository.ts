import db from '../db';
import type { Group, User } from '../schema';

export const groupRepository = {
  async getById(id: string): Promise<Group | undefined> {
    return db.getOne<Group>('SELECT * FROM groups WHERE id = ?', id);
  },

  async getAll(): Promise<Group[]> {
    return db.getAll<Group>('SELECT * FROM groups');
  },

  async getByOrganization(orgId: string): Promise<Group[]> {
    return db.getAll<Group>('SELECT * FROM groups WHERE organization_id = ?', orgId);
  },

  async getMembers(groupId: string): Promise<User[]> {
    return db.getAll<User>(
      'SELECT u.* FROM users u JOIN group_users gu ON u.id = gu.user_id WHERE gu.group_id = ?',
      groupId
    );
  },

  async getMemberIds(groupId: string): Promise<string[]> {
    const rows = await db.getAll<{ user_id: string }>('SELECT user_id FROM group_users WHERE group_id = ?', groupId);
    return rows.map(r => r.user_id);
  },

  async create(id: string, name: string, orgId: string): Promise<void> {
    await db.run('INSERT INTO groups (id, name, organization_id) VALUES (?, ?, ?)', id, name, orgId);
  },

  async updateName(id: string, name: string): Promise<boolean> {
    const info = await db.run('UPDATE groups SET name = ? WHERE id = ?', name, id);
    return info.changes > 0;
  },

  async setMembers(groupId: string, userIds: string[]): Promise<void> {
    await db.run('DELETE FROM group_users WHERE group_id = ?', groupId);
    for (const userId of userIds) {
      await db.run('INSERT INTO group_users (group_id, user_id) VALUES (?, ?)', groupId, userId);
    }
  },

  async addMembers(groupId: string, userIds: string[]): Promise<void> {
    for (const userId of userIds) {
      await db.run('INSERT INTO group_users (group_id, user_id) VALUES (?, ?)', groupId, userId);
    }
  },

  async removeAllMembers(groupId: string): Promise<void> {
    await db.run('DELETE FROM group_users WHERE group_id = ?', groupId);
  },

  async delete(id: string): Promise<void> {
    await db.run('DELETE FROM group_users WHERE group_id = ?', id);
    await db.run('DELETE FROM groups WHERE id = ?', id);
  },

  async deleteByOrganization(orgId: string): Promise<void> {
    await db.run('DELETE FROM groups WHERE organization_id = ?', orgId);
  },
};
