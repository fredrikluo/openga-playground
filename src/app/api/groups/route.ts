import { NextResponse, NextRequest } from 'next/server';
import db, { generateId } from '@/lib/db';
import { groupRepository } from '@/lib/repositories';
import { writeGroupTuples } from '@/lib/openfga-tuples';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (organizationId) {
      const groups = await groupRepository.getByOrganization(organizationId);
      return NextResponse.json(groups);
    }

    const groups = await groupRepository.getAll();
    return NextResponse.json(groups);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, organization_id, user_ids } = await request.json();
    if (!name || !organization_id) {
      return NextResponse.json({ message: 'Name and organization_id are required' }, { status: 400 });
    }

    const groupId = generateId();

    const newGroup = await db.transaction(async () => {
      await groupRepository.create(groupId, name, organization_id);

      if (user_ids && user_ids.length > 0) {
        await groupRepository.addMembers(groupId, user_ids);
      }

      return { id: groupId, name, organization_id, user_ids };
    });

    await writeGroupTuples(groupId, organization_id, user_ids || []);

    return NextResponse.json(newGroup, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
