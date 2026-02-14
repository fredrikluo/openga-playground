import { NextResponse, NextRequest } from 'next/server';
import db, { getAll, getOne } from '@/lib/db';
import type { Organization, Folder } from '@/lib/schema';
import { addUserToOrganization } from '@/lib/user-organization-helpers';
import { writeOrgMemberTuple, writeFolderTuples } from '@/lib/openfga-tuples';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      // Get all organizations for a user via junction table
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
      // Create hidden root folder (not displayed in UI)
      const hiddenRootStmt = db.prepare('INSERT INTO folders (name, parent_folder_id, organization_id) VALUES (?, NULL, NULL)');
      const hiddenRootInfo = hiddenRootStmt.run(`${name} Root`);
      const hiddenRootId = hiddenRootInfo.lastInsertRowid;

      // Create organization
      const orgStmt = db.prepare('INSERT INTO organizations (name, root_folder_id) VALUES (?, ?)');
      const orgInfo = orgStmt.run(name, hiddenRootId);
      const orgId = orgInfo.lastInsertRowid;

      // Update hidden root folder's organization_id
      const updateHiddenRootStmt = db.prepare('UPDATE folders SET organization_id = ? WHERE id = ?');
      updateHiddenRootStmt.run(orgId, hiddenRootId);

      // Create shared folder under the hidden root
      const sharedFolderStmt = db.prepare('INSERT INTO folders (name, parent_folder_id, organization_id) VALUES (?, ?, ?)');
      sharedFolderStmt.run(`${name} Shared Folder`, hiddenRootId, orgId);

      return { id: orgId, name, root_folder_id: hiddenRootId };
    });

    const newOrg = transaction();

    // Add user to organization (creates personal folder)
    addUserToOrganization(userId, newOrg.id, userRole);

    // Sync OpenFGA tuples: org membership + folder hierarchy
    const orgId = newOrg.id;
    await writeOrgMemberTuple(userId, orgId);
    // Hidden root folder
    await writeFolderTuples(newOrg.root_folder_id, orgId, null);
    // Shared folder + personal folder created by addUserToOrganization
    const childFolders = getAll<Folder>(
      'SELECT * FROM folders WHERE parent_folder_id = ? AND organization_id = ?',
      newOrg.root_folder_id, orgId
    );
    for (const folder of childFolders) {
      await writeFolderTuples(folder.id, orgId, newOrg.root_folder_id);
    }

    return NextResponse.json(newOrg, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}