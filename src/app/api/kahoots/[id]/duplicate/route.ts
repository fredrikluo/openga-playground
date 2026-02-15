import { NextRequest, NextResponse } from 'next/server';
import { kahootRepository } from '@/lib/repositories';
import { generateId } from '@/lib/db';
import { syncKahootCreated } from '@/lib/openfga-tuples';
import { checkWithPolicy as check } from '@/lib/policy';
import { getCurrentUserId } from '@/lib/auth';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const userId = getCurrentUserId(request);

    const kahoot = await kahootRepository.getById(id);
    if (!kahoot) {
      return NextResponse.json({ message: 'Kahoot not found' }, { status: 404 });
    }

    if (userId) {
      const allowed = await check(`user:${userId}`, 'can_duplicate_effective', `document:${id}`);
      if (!allowed) {
        return NextResponse.json({ message: 'Permission denied: cannot duplicate this kahoot' }, { status: 403 });
      }
    }

    const newId = generateId();
    const newName = `Duplicated ${kahoot.name}`;
    await kahootRepository.create(newId, newName, kahoot.folder_id, userId);

    if (userId) {
      await syncKahootCreated(newId, kahoot.folder_id, userId);
    }

    return NextResponse.json({ id: newId, name: newName, folder_id: kahoot.folder_id, creator_id: userId }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
