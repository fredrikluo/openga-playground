import { NextResponse, NextRequest } from 'next/server';
import db, { getAll } from '@/lib/db';
import type { Organization } from '@/lib/schema';

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
      // Create root folder
      const folderStmt = db.prepare('INSERT INTO folders (name, organization_id) VALUES (?, NULL)');
      const folderInfo = folderStmt.run(`${name} Shared Folder`);
      const rootFolderId = folderInfo.lastInsertRowid;

      // Create organization
      const orgStmt = db.prepare('INSERT INTO organizations (name, root_folder_id) VALUES (?, ?)');
      const orgInfo = orgStmt.run(name, rootFolderId);
      const orgId = orgInfo.lastInsertRowid;

      // Update folder's organization_id
      const updateFolderStmt = db.prepare('UPDATE folders SET organization_id = ? WHERE id = ?');
      updateFolderStmt.run(orgId, rootFolderId);

      // Add user to organization via junction table
      const userOrgStmt = db.prepare(`
        INSERT INTO user_organizations (user_id, organization_id, role)
        VALUES (?, ?, ?)
      `);
      userOrgStmt.run(userId, orgId, userRole);

      return { id: orgId, name, root_folder_id: rootFolderId };
    });

    const newOrg = transaction();

    return NextResponse.json(newOrg, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}