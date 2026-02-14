import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { folderRepository, kahootRepository } from '@/lib/repositories';
import { syncFolderMoved } from '@/lib/openfga-tuples';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const folder = await folderRepository.getById(id);
    if (!folder) {
      return NextResponse.json({ message: 'Folder not found' }, { status: 404 });
    }
    const subfolders = await folderRepository.getSubfolders(id);
    const kahoots = await kahootRepository.getByFolder(id);
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

    const oldFolder = await folderRepository.getById(id);

    const found = await folderRepository.update(id, name, parent_folder_id ?? null);
    if (!found) {
      return NextResponse.json({ message: 'Folder not found' }, { status: 404 });
    }

    if (oldFolder) {
      await syncFolderMoved(id, oldFolder.parent_folder_id, parent_folder_id ?? null);
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

    const info = await db.transaction(async () => {
      const folder = await folderRepository.getById(id);
      if (!folder) {
        return { changes: 0 };
      }
      await folderRepository.deleteFolderRecursive(id);
      return { changes: 1 };
    });

    if (info.changes === 0) {
      return NextResponse.json({ message: 'Folder not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Folder and its contents deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
