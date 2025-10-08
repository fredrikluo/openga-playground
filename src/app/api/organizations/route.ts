import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const organizations = db.prepare('SELECT * FROM organizations').all();
    return NextResponse.json(organizations);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }

    const transaction = db.transaction(() => {
      const folderStmt = db.prepare('INSERT INTO folders (name) VALUES (?)');
      const folderInfo = folderStmt.run(`${name} Root Folder`);
      const rootFolderId = folderInfo.lastInsertRowid;

      const orgStmt = db.prepare('INSERT INTO organizations (name, root_folder_id) VALUES (?, ?)');
      const orgInfo = orgStmt.run(name, rootFolderId);

      return { id: orgInfo.lastInsertRowid, name, root_folder_id: rootFolderId };
    });

    const newOrg = transaction();

    return NextResponse.json(newOrg, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}