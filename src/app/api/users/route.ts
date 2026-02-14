import { NextResponse, NextRequest } from 'next/server';
import db, { getAll } from '@/lib/db';
import type { User } from '@/lib/schema';
import { addUserToOrganization } from '@/lib/user-organization-helpers';
import { syncOrgCreated, syncUserAddedToOrg } from '@/lib/openfga-tuples';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const unassigned = searchParams.get('unassigned');

    if (unassigned === 'true') {
      const users = getAll<User>(`
        SELECT DISTINCT u.* FROM users u
        LEFT JOIN user_organizations uo ON u.id = uo.user_id
        WHERE uo.user_id IS NULL
      `);
      return NextResponse.json(users);
    }

    if (organizationId) {
      const users = getAll<User>(`
        SELECT DISTINCT u.id, u.name, u.email
        FROM users u
        JOIN user_organizations uo ON u.id = uo.user_id
        WHERE uo.organization_id = ?
        ORDER BY u.name
      `, organizationId);
      return NextResponse.json(users);
    }

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
        const hiddenRootStmt = db.prepare('INSERT INTO folders (name, parent_folder_id, organization_id) VALUES (?, NULL, NULL)');
        const hiddenRootInfo = hiddenRootStmt.run(`${newOrganization} Root`);
        const hiddenRootId = hiddenRootInfo.lastInsertRowid;

        const orgStmt = db.prepare('INSERT INTO organizations (name, root_folder_id) VALUES (?, ?)');
        const orgInfo = orgStmt.run(newOrganization, hiddenRootId);
        const newOrgId = orgInfo.lastInsertRowid;

        const updateHiddenRootStmt = db.prepare('UPDATE folders SET organization_id = ? WHERE id = ?');
        updateHiddenRootStmt.run(newOrgId, hiddenRootId);

        const sharedFolderStmt = db.prepare('INSERT INTO folders (name, parent_folder_id, organization_id) VALUES (?, ?, ?)');
        sharedFolderStmt.run(`${newOrganization} Shared Folder`, hiddenRootId, newOrgId);

        return { orgId: newOrgId as number, rootFolderId: hiddenRootId as number };
      });
      const result = orgTransaction();
      orgId = result.orgId;
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
          db.prepare('DELETE FROM users WHERE id = ?').run(newUser.id);
          return NextResponse.json({ message: orgError.message }, { status: 409 });
        }
        throw orgError;
      }

      if (newOrganization) {
        // New org: sync all folder tuples + membership
        const org = db.prepare('SELECT root_folder_id FROM organizations WHERE id = ?').get(orgId) as { root_folder_id: number } | undefined;
        if (org) {
          await syncOrgCreated(orgId, org.root_folder_id, newUser.id);
        }
      } else {
        await syncUserAddedToOrg(newUser.id, orgId, name);
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
