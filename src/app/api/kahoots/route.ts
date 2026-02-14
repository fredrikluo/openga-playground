import { NextResponse } from 'next/server';
import db, { getAll, getOne } from '@/lib/db';
import type { Kahoot, Folder } from '@/lib/schema';
import { writeDocumentTuples } from '@/lib/openfga-tuples';

export async function GET() {
  try {
    const kahoots = getAll<Kahoot>('SELECT * FROM kahoots');
    return NextResponse.json(kahoots);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, folder_id } = await request.json();
    if (!name || !folder_id) {
      return NextResponse.json({ message: 'Name and folder_id are required' }, { status: 400 });
    }
    const stmt = db.prepare('INSERT INTO kahoots (name, folder_id) VALUES (?, ?)');
    const info = stmt.run(name, folder_id);

    // Sync OpenFGA: document parent + in_org tuples
    const parentFolder = getOne<Folder>('SELECT organization_id FROM folders WHERE id = ?', folder_id);
    if (parentFolder) {
      await writeDocumentTuples(info.lastInsertRowid, folder_id, parentFolder.organization_id);
    }

    return NextResponse.json({ id: info.lastInsertRowid, name, folder_id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}