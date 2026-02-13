import { NextResponse, NextRequest } from 'next/server';
import db, { getAll, getOne } from '@/lib/db';
import type { Folder } from '@/lib/schema';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ message: 'organizationId is required' }, { status: 400 });
    }

    const folders = getAll<Folder>('SELECT * FROM folders WHERE organization_id = ?', organizationId);
    return NextResponse.json(folders);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, parent_folder_id, organization_id } = await request.json();
    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }

    // If parent_folder_id is provided, inherit organization_id from parent
    let orgId = organization_id;
    if (parent_folder_id) {
      const parentFolder = getOne<Folder>('SELECT organization_id FROM folders WHERE id = ?', parent_folder_id);
      if (parentFolder) {
        orgId = parentFolder.organization_id;
      }
    }

    if (!orgId) {
      return NextResponse.json({ message: 'organization_id is required' }, { status: 400 });
    }

    const stmt = db.prepare('INSERT INTO folders (name, parent_folder_id, organization_id) VALUES (?, ?, ?)');
    const info = stmt.run(name, parent_folder_id, orgId);
    return NextResponse.json({ id: info.lastInsertRowid, name, parent_folder_id, organization_id: orgId }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ message: 'A folder with this name already exists at this location' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}