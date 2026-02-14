import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { groupRepository } from '@/lib/repositories';
import { syncGroupMembers, deleteGroupTuples } from '@/lib/openfga-tuples';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const group = await groupRepository.getById(id);
    if (!group) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 });
    }
    const users = await groupRepository.getMembers(id);
    return NextResponse.json({ ...group, users });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { name, user_ids } = await request.json();
    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }

    const oldMembers = await groupRepository.getMemberIds(id);

    const info = await db.transaction(async () => {
      const found = await groupRepository.updateName(id, name);
      if (!found) {
        return { changes: 0 };
      }

      await groupRepository.setMembers(id, user_ids || []);
      return { changes: 1 };
    });

    if (info.changes === 0) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 });
    }

    await syncGroupMembers(id, oldMembers, user_ids || []);

    return NextResponse.json({ id, name, user_ids });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const group = await groupRepository.getById(id);
    const members = await groupRepository.getMemberIds(id);

    const info = await db.transaction(async () => {
      if (!group) {
        return { changes: 0 };
      }
      await groupRepository.delete(id);
      return { changes: 1 };
    });

    if (info.changes === 0) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 });
    }

    if (group) {
      await deleteGroupTuples(id, group.organization_id, members);
    }

    return NextResponse.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
