import { NextResponse } from 'next/server';
import db, { getOne, getAll } from '@/lib/db';
import type { Group, User } from '@/lib/schema';
import { syncGroupMembers, deleteGroupTuples } from '@/lib/openfga-tuples';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const group = getOne<Group>('SELECT * FROM groups WHERE id = ?', id);
    if (!group) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 });
    }
    const users = getAll<User>('SELECT u.* FROM users u JOIN group_users gu ON u.id = gu.user_id WHERE gu.group_id = ?', id);
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

    const oldMembers = getAll<{ user_id: string }>('SELECT user_id FROM group_users WHERE group_id = ?', id);

    const transaction = db.transaction(() => {
      const updateStmt = db.prepare('UPDATE groups SET name = ? WHERE id = ?');
      const info = updateStmt.run(name, id);
      if (info.changes === 0) {
        return { changes: 0 };
      }

      db.prepare('DELETE FROM group_users WHERE group_id = ?').run(id);
      if (user_ids && user_ids.length > 0) {
        const addUserStmt = db.prepare('INSERT INTO group_users (group_id, user_id) VALUES (?, ?)');
        for (const userId of user_ids) {
          addUserStmt.run(id, userId);
        }
      }
      return info;
    });

    const info = transaction();
    if (info.changes === 0) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 });
    }

    await syncGroupMembers(id, oldMembers.map(m => m.user_id), user_ids || []);

    return NextResponse.json({ id, name, user_ids });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const group = getOne<Group>('SELECT * FROM groups WHERE id = ?', id);
    const members = getAll<{ user_id: string }>('SELECT user_id FROM group_users WHERE group_id = ?', id);

    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM group_users WHERE group_id = ?').run(id);
      const info = db.prepare('DELETE FROM groups WHERE id = ?').run(id);
      return info;
    });

    const info = transaction();
    if (info.changes === 0) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 });
    }

    if (group) {
      await deleteGroupTuples(id, group.organization_id, members.map(m => m.user_id));
    }

    return NextResponse.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
