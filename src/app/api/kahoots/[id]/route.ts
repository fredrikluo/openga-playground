import { NextResponse } from 'next/server';
import db, { getOne } from '@/lib/db';
import type { Kahoot, Folder } from '@/lib/schema';
import { updateDocumentParentTuple, deleteDocumentTuples } from '@/lib/openfga-tuples';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const kahoot = getOne<Kahoot>('SELECT * FROM kahoots WHERE id = ?', id);
    if (!kahoot) {
      return NextResponse.json({ message: 'Kahoot not found' }, { status: 404 });
    }
    return NextResponse.json(kahoot);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { name, folder_id } = await request.json();
    if (!name || !folder_id) {
      return NextResponse.json({ message: 'Name and folder_id are required' }, { status: 400 });
    }

    // Get old kahoot data to detect folder change
    const oldKahoot = getOne<Kahoot>('SELECT * FROM kahoots WHERE id = ?', id);

    const stmt = db.prepare('UPDATE kahoots SET name = ?, folder_id = ? WHERE id = ?');
    const info = stmt.run(name, folder_id, id);
    if (info.changes === 0) {
      return NextResponse.json({ message: 'Kahoot not found' }, { status: 404 });
    }

    // Sync OpenFGA: update parent tuple if folder changed
    if (oldKahoot && oldKahoot.folder_id !== folder_id) {
      await updateDocumentParentTuple(Number(id), oldKahoot.folder_id, folder_id);
    }

    return NextResponse.json({ id, name, folder_id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    // Get kahoot data before deletion for tuple cleanup
    const kahoot = getOne<Kahoot>('SELECT * FROM kahoots WHERE id = ?', id);

    const stmt = db.prepare('DELETE FROM kahoots WHERE id = ?');
    const info = stmt.run(id);
    if (info.changes === 0) {
      return NextResponse.json({ message: 'Kahoot not found' }, { status: 404 });
    }

    // Clean up OpenFGA tuples
    if (kahoot) {
      const folder = getOne<Folder>('SELECT organization_id FROM folders WHERE id = ?', kahoot.folder_id);
      if (folder) {
        await deleteDocumentTuples(Number(id), kahoot.folder_id, folder.organization_id);
      }
    }

    return NextResponse.json({ message: 'Kahoot deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}