import { NextResponse } from 'next/server';
import db, { getOne, getAll } from '@/lib/db';
import type { Folder, Kahoot } from '@/lib/schema';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const folder = getOne<Folder>('SELECT * FROM folders WHERE id = ?', id);
    if (!folder) {
      return NextResponse.json({ message: 'Folder not found' }, { status: 404 });
    }
    const subfolders = getAll<Folder>('SELECT * FROM folders WHERE parent_folder_id = ?', id);
    const kahoots = getAll<Kahoot>('SELECT * FROM kahoots WHERE folder_id = ?', id);
    return NextResponse.json({ ...folder, subfolders, kahoots });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { name, parent_folder_id } = await request.json();
    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }
    const stmt = db.prepare('UPDATE folders SET name = ?, parent_folder_id = ? WHERE id = ?');
    const info = stmt.run(name, parent_folder_id, id);
    if (info.changes === 0) {
      return NextResponse.json({ message: 'Folder not found' }, { status: 404 });
    }
    return NextResponse.json({ id, name, parent_folder_id });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ message: 'A folder with this name already exists at this location' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const deleteFolderAndContents = (folderId: number | bigint) => {
      const subfolders = getAll<Pick<Folder, 'id'>>('SELECT id FROM folders WHERE parent_folder_id = ?', folderId);
      for (const subfolder of subfolders) {
        deleteFolderAndContents(subfolder.id);
      }

      db.prepare('DELETE FROM kahoots WHERE folder_id = ?').run(folderId);
      db.prepare('DELETE FROM folders WHERE id = ?').run(folderId);
    };

    const transaction = db.transaction(() => {
      const folder = db.prepare('SELECT id FROM folders WHERE id = ?').get(id) as Pick<Folder, 'id'> | undefined;
      if (!folder) {
        return { changes: 0 };
      }
      deleteFolderAndContents(folder.id);
      return { changes: 1 };
    });

    const info = transaction();

    if (info.changes === 0) {
      return NextResponse.json({ message: 'Folder not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Folder and its contents deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}