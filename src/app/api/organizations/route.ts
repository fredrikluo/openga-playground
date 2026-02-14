import { NextResponse, NextRequest } from 'next/server';
import db, { getAll } from '@/lib/db';
import type { Organization } from '@/lib/schema';
import { addUserToOrganization } from '@/lib/user-organization-helpers';
import { syncOrgCreated } from '@/lib/openfga-tuples';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      const organizations = getAll<Organization>(`
        SELECT o.* FROM organizations o
        JOIN user_organizations uo ON o.id = uo.organization_id
        WHERE uo.user_id = ?
        ORDER BY o.name
      `, userId);
      return NextResponse.json(organizations);
    }

    const organizations = getAll<Organization>('SELECT * FROM organizations ORDER BY name');
    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, userId, userRole = 'admin' } = await request.json();
    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    const transaction = db.transaction(() => {
      const hiddenRootStmt = db.prepare('INSERT INTO folders (name, parent_folder_id, organization_id) VALUES (?, NULL, NULL)');
      const hiddenRootInfo = hiddenRootStmt.run(`${name} Root`);
      const hiddenRootId = hiddenRootInfo.lastInsertRowid;

      const orgStmt = db.prepare('INSERT INTO organizations (name, root_folder_id) VALUES (?, ?)');
      const orgInfo = orgStmt.run(name, hiddenRootId);
      const orgId = orgInfo.lastInsertRowid;

      const updateHiddenRootStmt = db.prepare('UPDATE folders SET organization_id = ? WHERE id = ?');
      updateHiddenRootStmt.run(orgId, hiddenRootId);

      const sharedFolderStmt = db.prepare('INSERT INTO folders (name, parent_folder_id, organization_id) VALUES (?, ?, ?)');
      sharedFolderStmt.run(`${name} Shared Folder`, hiddenRootId, orgId);

      return { id: orgId, name, root_folder_id: hiddenRootId };
    });

    const newOrg = transaction();
    addUserToOrganization(userId, newOrg.id, userRole);
    await syncOrgCreated(newOrg.id, newOrg.root_folder_id, userId);

    return NextResponse.json(newOrg, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
