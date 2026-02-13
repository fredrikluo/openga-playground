import { NextResponse, NextRequest } from 'next/server';
import db, { getAll } from '@/lib/db';
import type { User } from '@/lib/schema';
import { addUserToOrganization } from '@/lib/user-organization-helpers';

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
        // Create hidden root folder (not displayed in UI)
        const hiddenRootStmt = db.prepare('INSERT INTO folders (name, parent_folder_id, organization_id) VALUES (?, NULL, NULL)');
        const hiddenRootInfo = hiddenRootStmt.run(`${newOrganization} Root`);
        const hiddenRootId = hiddenRootInfo.lastInsertRowid;

        // Create organization
        const orgStmt = db.prepare('INSERT INTO organizations (name, root_folder_id) VALUES (?, ?)');
        const orgInfo = orgStmt.run(newOrganization, hiddenRootId);
        const newOrgId = orgInfo.lastInsertRowid;

        // Update hidden root folder's organization_id
        const updateHiddenRootStmt = db.prepare('UPDATE folders SET organization_id = ? WHERE id = ?');
        updateHiddenRootStmt.run(newOrgId, hiddenRootId);

        // Create shared folder under the hidden root
        const sharedFolderStmt = db.prepare('INSERT INTO folders (name, parent_folder_id, organization_id) VALUES (?, ?, ?)');
        sharedFolderStmt.run(`${newOrganization} Shared Folder`, hiddenRootId, newOrgId);

        return newOrgId as number;
      });
      orgId = orgTransaction();
    }

    // Create user
    const transaction = db.transaction(() => {
      const userStmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
      const userInfo = userStmt.run(name, email);
      return { id: userInfo.lastInsertRowid as number, name, email };
    });

    const newUser = transaction();

    // Add to organization if provided (this creates the personal folder)
    if (orgId) {
      try {
        addUserToOrganization(newUser.id, orgId, role);
      } catch (orgError: unknown) {
        if (orgError instanceof Error && orgError.message.includes('A user with this name already exists')) {
          // Delete the user we just created since adding to org failed
          db.prepare('DELETE FROM users WHERE id = ?').run(newUser.id);
          return NextResponse.json({ message: orgError.message }, { status: 409 });
        }
        throw orgError;
      }
    }
    return NextResponse.json(newUser, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ message: 'A user with this email already exists' }, { status: 409 });
    }
    console.error('Error creating user:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}