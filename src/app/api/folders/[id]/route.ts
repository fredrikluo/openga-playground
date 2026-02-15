import { NextResponse, NextRequest } from 'next/server';
import db from '@/lib/db';
import { folderRepository, kahootRepository } from '@/lib/repositories';
import { syncFolderMoved, syncFolderDeletedRecursive } from '@/lib/openfga-tuples';
import { check } from '@/lib/openfga';
import { getCurrentUserId } from '@/lib/auth';

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

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const userId = getCurrentUserId(request);
    const { name, parent_folder_id } = await request.json();
    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }

    const oldFolder = await folderRepository.getById(id);
    if (!oldFolder) {
      return NextResponse.json({ message: 'Folder not found' }, { status: 404 });
    }

    // Permission check for edit (rename)
    if (userId && oldFolder.name !== name) {
      const canEdit = await check(`user:${userId}`, 'can_edit_effective', `folder:${id}`);
      if (!canEdit) {
        return NextResponse.json({ message: 'Permission denied: cannot edit this folder' }, { status: 403 });
      }
    }

    // Permission checks for move (parent changed)
    if (userId && parent_folder_id && oldFolder.parent_folder_id !== parent_folder_id) {
      const canRemoveFromSource = await check(`user:${userId}`, 'can_remove_effective', `folder:${id}`);
      if (!canRemoveFromSource) {
        return NextResponse.json({ message: 'Permission denied: cannot move this folder' }, { status: 403 });
      }
      const canCreateInDest = await check(`user:${userId}`, 'can_create_effective', `folder:${parent_folder_id}`);
      if (!canCreateInDest) {
        return NextResponse.json({ message: 'Permission denied: cannot move to destination folder' }, { status: 403 });
      }
    }

    const found = await folderRepository.update(id, name, parent_folder_id ?? null);
    if (!found) {
      return NextResponse.json({ message: 'Folder not found' }, { status: 404 });
    }

    if (oldFolder.parent_folder_id !== (parent_folder_id ?? null)) {
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

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const userId = getCurrentUserId(request);

    if (userId) {
      const allowed = await check(`user:${userId}`, 'can_remove_effective', `folder:${id}`);
      if (!allowed) {
        return NextResponse.json({ message: 'Permission denied: cannot delete this folder' }, { status: 403 });
      }
    }

    // Clean up FGA tuples before deleting from DB
    await syncFolderDeletedRecursive(id);

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
