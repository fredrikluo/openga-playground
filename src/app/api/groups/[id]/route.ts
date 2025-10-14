import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
    if (!group) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 });
    }
    const users = db.prepare('SELECT u.* FROM users u JOIN group_users gu ON u.id = gu.user_id WHERE gu.group_id = ?').all(id);
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

    const transaction = db.transaction(() => {
      const updateStmt = db.prepare('UPDATE groups SET name = ? WHERE id = ?');
      const info = updateStmt.run(name, id);

      if (info.changes === 0) {
        return { changes: 0 };
      }

      const deleteUsersStmt = db.prepare('DELETE FROM group_users WHERE group_id = ?');
      deleteUsersStmt.run(id);

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
    return NextResponse.json({ id, name, user_ids });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const transaction = db.transaction(() => {
      const deleteUsersStmt = db.prepare('DELETE FROM group_users WHERE group_id = ?');
      deleteUsersStmt.run(id);

      const deleteGroupStmt = db.prepare('DELETE FROM groups WHERE id = ?');
      const info = deleteGroupStmt.run(id);
      return info;
    });

    const info = transaction();

    if (info.changes === 0) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}