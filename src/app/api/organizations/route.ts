import { NextResponse, NextRequest } from 'next/server';
import db, { getOne, getAll } from '@/lib/db';
import type { Organization } from '@/lib/schema';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      const organization = getOne<Organization>(`
        SELECT o.* FROM organizations o
        JOIN users u ON o.id = u.organization_id
        WHERE u.id = ?
      `, userId);
      return NextResponse.json(organization ? [organization] : []);
    }

    const organizations = getAll<Organization>('SELECT * FROM organizations');
    return NextResponse.json(organizations);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, userId } = await request.json();
    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    const transaction = db.transaction(() => {
      const folderStmt = db.prepare('INSERT INTO folders (name) VALUES (?)');
      const folderInfo = folderStmt.run(`${name} Root Folder`);
      const rootFolderId = folderInfo.lastInsertRowid;

      const orgStmt = db.prepare('INSERT INTO organizations (name, root_folder_id) VALUES (?, ?)');
      const orgInfo = orgStmt.run(name, rootFolderId);
      const orgId = orgInfo.lastInsertRowid;

      const updateUserStmt = db.prepare('UPDATE users SET organization_id = ? WHERE id = ?');
      updateUserStmt.run(orgId, userId);

      return { id: orgId, name, root_folder_id: rootFolderId };
    });

    const newOrg = transaction();

    return NextResponse.json(newOrg, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}