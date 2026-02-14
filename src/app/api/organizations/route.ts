import { NextResponse, NextRequest } from 'next/server';
import db, { getAll, generateId } from '@/lib/db';
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

    const orgId = generateId();
    const hiddenRootId = generateId();
    const sharedFolderId = generateId();

    const transaction = db.transaction(() => {
      db.prepare('INSERT INTO folders (id, name, parent_folder_id, organization_id) VALUES (?, ?, NULL, NULL)').run(hiddenRootId, `${name} Root`);
      db.prepare('INSERT INTO organizations (id, name, root_folder_id) VALUES (?, ?, ?)').run(orgId, name, hiddenRootId);
      db.prepare('UPDATE folders SET organization_id = ? WHERE id = ?').run(orgId, hiddenRootId);
      db.prepare('INSERT INTO folders (id, name, parent_folder_id, organization_id) VALUES (?, ?, ?, ?)').run(sharedFolderId, `${name} Shared Folder`, hiddenRootId, orgId);

      return { id: orgId, name, root_folder_id: hiddenRootId };
    });

    const newOrg = transaction();
    addUserToOrganization(userId, orgId, userRole);
    await syncOrgCreated(orgId, hiddenRootId, userId);

    return NextResponse.json(newOrg, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
