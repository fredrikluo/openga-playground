import { NextResponse, NextRequest } from 'next/server';
import db, { getAll } from '@/lib/db';
import type { User } from '@/lib/schema';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const unassigned = searchParams.get('unassigned');

    if (unassigned === 'true') {
      // Get users not in any organization
      const users = getAll<User>(`
        SELECT DISTINCT u.* FROM users u
        LEFT JOIN user_organizations uo ON u.id = uo.user_id
        WHERE uo.user_id IS NULL
      `);
      return NextResponse.json(users);
    }

    if (organizationId) {
      // Get users in a specific organization
      const users = getAll<User>(`
        SELECT DISTINCT u.id, u.name, u.email
        FROM users u
        JOIN user_organizations uo ON u.id = uo.user_id
        WHERE uo.organization_id = ?
        ORDER BY u.name
      `, organizationId);
      return NextResponse.json(users);
    }

    // Get all users
    const users = getAll<User>('SELECT * FROM users ORDER BY name');
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, organizationId, role = 'member', newOrganization } = await request.json();
    if (!name || !email) {
      return NextResponse.json({ message: 'Name and email are required' }, { status: 400 });
    }

    let orgId = organizationId;

    // If creating a new organization
    if (newOrganization) {
      const orgTransaction = db.transaction(() => {
        const folderStmt = db.prepare('INSERT INTO folders (name, organization_id) VALUES (?, NULL)');
        const folderInfo = folderStmt.run(`${newOrganization} Shared Folder`);
        const rootFolderId = folderInfo.lastInsertRowid;

        const orgStmt = db.prepare('INSERT INTO organizations (name, root_folder_id) VALUES (?, ?)');
        const orgInfo = orgStmt.run(newOrganization, rootFolderId);
        const newOrgId = orgInfo.lastInsertRowid;

        // Update folder's organization_id
        const updateFolderStmt = db.prepare('UPDATE folders SET organization_id = ? WHERE id = ?');
        updateFolderStmt.run(newOrgId, rootFolderId);

        return newOrgId as number;
      });
      orgId = orgTransaction();
    }

    // Create user and optionally add to organization
    const transaction = db.transaction(() => {
      // Create user
      const userStmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
      const userInfo = userStmt.run(name, email);
      const userId = userInfo.lastInsertRowid as number;

      // Add to organization if provided
      if (orgId) {
        const orgStmt = db.prepare(`
          INSERT INTO user_organizations (user_id, organization_id, role)
          VALUES (?, ?, ?)
        `);
        orgStmt.run(userId, orgId, role);
      }

      return { id: userId, name, email };
    });

    const newUser = transaction();
    return NextResponse.json(newUser, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ message: 'A user with this email already exists' }, { status: 409 });
    }
    console.error('Error creating user:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}