import { NextResponse, NextRequest } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const currentUserId = searchParams.get('currentUserId');

    if (organizationId) {
      if (!currentUserId) {
        return NextResponse.json({ message: 'currentUserId is required' }, { status: 400 });
      }

      const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(currentUserId);

      if (!currentUser || currentUser.organization_id !== parseInt(organizationId, 10)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }

      const users = db.prepare('SELECT * FROM users WHERE organization_id = ?').all(organizationId);
      return NextResponse.json(users);
    }

    const users = db.prepare('SELECT * FROM users').all();
    return NextResponse.json(users);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, organizationId, newOrganization } = await request.json();
    if (!name || !email) {
      return NextResponse.json({ message: 'Name and email are required' }, { status: 400 });
    }

    let orgId = organizationId;

    if (newOrganization) {
      const orgTransaction = db.transaction(() => {
        const folderStmt = db.prepare('INSERT INTO folders (name) VALUES (?)');
        const folderInfo = folderStmt.run(`${newOrganization} Root Folder`);
        const rootFolderId = folderInfo.lastInsertRowid;

        const orgStmt = db.prepare('INSERT INTO organizations (name, root_folder_id) VALUES (?, ?)');
        const orgInfo = orgStmt.run(newOrganization, rootFolderId);
        return orgInfo.lastInsertRowid as number;
      });
      orgId = orgTransaction();
    }

    if (!orgId) {
      return NextResponse.json({ message: 'Organization is required' }, { status: 400 });
    }

    const stmt = db.prepare('INSERT INTO users (name, email, organization_id) VALUES (?, ?, ?)');
    const info = stmt.run(name, email, orgId);
    return NextResponse.json({ id: info.lastInsertRowid, name, email, organization_id: orgId }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}