import { NextResponse, NextRequest } from 'next/server';
import { kahootRepository } from '@/lib/repositories';
import { syncKahootUpdated, syncKahootDeleted } from '@/lib/openfga-tuples';
import { check } from '@/lib/openfga';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const kahoot = await kahootRepository.getById(id);
    if (!kahoot) {
      return NextResponse.json({ message: 'Kahoot not found' }, { status: 404 });
    }
    return NextResponse.json(kahoot);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const userId = getCurrentUserId(request);
    const { name, folder_id } = await request.json();
    if (!name || !folder_id) {
      return NextResponse.json({ message: 'Name and folder_id are required' }, { status: 400 });
    }

    const oldKahoot = await kahootRepository.getById(id);
    if (!oldKahoot) {
      return NextResponse.json({ message: 'Kahoot not found' }, { status: 404 });
    }

    // Permission check for edit (rename)
    if (userId && oldKahoot.name !== name) {
      const canEdit = await check(`user:${userId}`, 'can_edit_effective', `document:${id}`);
      if (!canEdit) {
        return NextResponse.json({ message: 'Permission denied: cannot edit this kahoot' }, { status: 403 });
      }
    }

    // Permission checks for move (folder changed)
    if (userId && oldKahoot.folder_id !== folder_id) {
      const canRemove = await check(`user:${userId}`, 'can_remove_effective', `document:${id}`);
      if (!canRemove) {
        return NextResponse.json({ message: 'Permission denied: cannot move this kahoot' }, { status: 403 });
      }
      const canCreateInDest = await check(`user:${userId}`, 'can_create_effective', `folder:${folder_id}`);
      if (!canCreateInDest) {
        return NextResponse.json({ message: 'Permission denied: cannot move to destination folder' }, { status: 403 });
      }
    }

    const found = await kahootRepository.update(id, name, folder_id);
    if (!found) {
      return NextResponse.json({ message: 'Kahoot not found' }, { status: 404 });
    }

    await syncKahootUpdated(id, oldKahoot.folder_id, folder_id);

    return NextResponse.json({ id, name, folder_id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const userId = getCurrentUserId(request);

    const kahoot = await kahootRepository.getById(id);

    if (!kahoot) {
      return NextResponse.json({ message: 'Kahoot not found' }, { status: 404 });
    }

    if (userId) {
      const allowed = await check(`user:${userId}`, 'can_remove_effective', `document:${id}`);
      if (!allowed) {
        return NextResponse.json({ message: 'Permission denied: cannot delete this document' }, { status: 403 });
      }
    }

    await kahootRepository.delete(id);

    await syncKahootDeleted(id);

    return NextResponse.json({ message: 'Kahoot deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
