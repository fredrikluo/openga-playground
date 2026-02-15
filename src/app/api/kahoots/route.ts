import { NextResponse, NextRequest } from 'next/server';
import { generateId } from '@/lib/db';
import { kahootRepository } from '@/lib/repositories';
import { syncKahootCreated } from '@/lib/openfga-tuples';
import { check } from '@/lib/openfga';
import { getCurrentUserId } from '@/lib/auth';

export async function GET() {
  try {
    const kahoots = await kahootRepository.getAll();
    return NextResponse.json(kahoots);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getCurrentUserId(request);
    const { name, folder_id } = await request.json();
    if (!name || !folder_id) {
      return NextResponse.json({ message: 'Name and folder_id are required' }, { status: 400 });
    }

    if (userId) {
      const allowed = await check(`user:${userId}`, 'can_create_effective', `folder:${folder_id}`);
      if (!allowed) {
        return NextResponse.json({ message: 'Permission denied: cannot create in this folder' }, { status: 403 });
      }
    }

    const kahootId = generateId();
    await kahootRepository.create(kahootId, name, folder_id, userId);

    await syncKahootCreated(kahootId, folder_id, userId || '');

    return NextResponse.json({ id: kahootId, name, folder_id, creator_id: userId }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
