import { NextResponse, NextRequest } from 'next/server';
import db, { getAll } from '@/lib/db';
import type { Group } from '@/lib/schema';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (organizationId) {
      const groups = getAll<Group>('SELECT * FROM groups WHERE organization_id = ?', organizationId);
      return NextResponse.json(groups);
    }

    const groups = getAll<Group>('SELECT * FROM groups');
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

    const transaction = db.transaction(() => {
      const groupStmt = db.prepare('INSERT INTO groups (name, organization_id) VALUES (?, ?)');
      const groupInfo = groupStmt.run(name, organization_id);
      const groupId = groupInfo.lastInsertRowid;

      if (user_ids && user_ids.length > 0) {
        const addUserStmt = db.prepare('INSERT INTO group_users (group_id, user_id) VALUES (?, ?)');
        for (const userId of user_ids) {
          addUserStmt.run(groupId, userId);
        }
      }

      return { id: groupId, name, organization_id, user_ids };
    });

    const newGroup = transaction();

    return NextResponse.json(newGroup, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}