import { NextResponse, NextRequest } from 'next/server';
import db, { getOne, getAll } from '@/lib/db';
import type { User } from '@/lib/schema';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const currentUserId = searchParams.get('currentUserId');
    const unassigned = searchParams.get('unassigned');

    if (unassigned === 'true') {
      const users = getAll<User>('SELECT * FROM users WHERE organization_id IS NULL');
      return NextResponse.json(users);
    }

    if (organizationId) {
      if (!currentUserId) {
        return NextResponse.json({ message: 'currentUserId is required' }, { status: 400 });
      }

      const currentUser = getOne<User>('SELECT * FROM users WHERE id = ?', currentUserId);

      if (!currentUser || currentUser.organization_id !== parseInt(organizationId, 10)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }

      const users = getAll<User>('SELECT * FROM users WHERE organization_id = ?', organizationId);
      return NextResponse.json(users);
    }

    const users = getAll<User>('SELECT * FROM users');
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
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ message: 'A user with this email already exists' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}