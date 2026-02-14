import db from '../db';

export const userOrganizationRepository = {
  async getOrgIdsByUser(userId: string): Promise<string[]> {
    const rows = await db.getAll<{ organization_id: string }>(
      'SELECT organization_id FROM user_organizations WHERE user_id = $1', userId
    );
    return rows.map(r => r.organization_id);
  },

  async getMemberUserIds(orgId: string): Promise<string[]> {
    const rows = await db.getAll<{ user_id: string }>(
      'SELECT user_id FROM user_organizations WHERE organization_id = $1', orgId
    );
    return rows.map(r => r.user_id);
  },

  async addUserToOrg(userId: string, orgId: string, role: string): Promise<void> {
    await db.run(
      `INSERT INTO user_organizations (user_id, organization_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role`,
      userId, orgId, role
    );
  },

  async removeUserFromOrg(userId: string, orgId: string): Promise<void> {
    await db.run(
      'DELETE FROM user_organizations WHERE user_id = $1 AND organization_id = $2',
      userId, orgId
    );
  },

  async updateRole(userId: string, orgId: string, role: string): Promise<void> {
    await db.run(
      'UPDATE user_organizations SET role = $1 WHERE user_id = $2 AND organization_id = $3',
      role, userId, orgId
    );
  },

  async hasDuplicateName(userName: string, orgId: string, excludeUserId: string): Promise<boolean> {
    const existing = await db.getOne<{ id: string }>(`
      SELECT u.id FROM users u
      JOIN user_organizations uo ON u.id = uo.user_id
      WHERE u.name = $1 AND uo.organization_id = $2 AND u.id != $3
    `, userName, orgId, excludeUserId);
    return !!existing;
  },
};
