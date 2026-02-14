import { NextResponse } from 'next/server';
import { kahootRepository } from '@/lib/repositories';
import { syncKahootUpdated, syncKahootDeleted } from '@/lib/openfga-tuples';

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

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { name, folder_id } = await request.json();
    if (!name || !folder_id) {
      return NextResponse.json({ message: 'Name and folder_id are required' }, { status: 400 });
    }

    const oldKahoot = await kahootRepository.getById(id);

    const found = await kahootRepository.update(id, name, folder_id);
    if (!found) {
      return NextResponse.json({ message: 'Kahoot not found' }, { status: 404 });
    }

    if (oldKahoot) {
      await syncKahootUpdated(id, oldKahoot.folder_id, folder_id);
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

    const kahoot = await kahootRepository.getById(id);

    if (!kahoot) {
      return NextResponse.json({ message: 'Kahoot not found' }, { status: 404 });
    }

    await kahootRepository.delete(id);

    await syncKahootDeleted(id, kahoot.folder_id);

    return NextResponse.json({ message: 'Kahoot deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
