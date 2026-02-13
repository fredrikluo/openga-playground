import { NextResponse, NextRequest } from 'next/server';
import db, { getOne } from '@/lib/db';
import type { User } from '@/lib/schema';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = getOne<User>('SELECT * FROM users WHERE id = ?', id);

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { role, organization_id, currentUserId } = await request.json();

    if (!currentUserId) {
      return NextResponse.json({ message: 'currentUserId is required' }, { status: 400 });
    }

    const currentUser = getOne<User>('SELECT * FROM users WHERE id = ?', currentUserId);
    const targetUser = getOne<User>('SELECT * FROM users WHERE id = ?', id);

    if (!currentUser || !targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (organization_id !== undefined) {
      const stmt = db.prepare('UPDATE users SET organization_id = ? WHERE id = ?');
      stmt.run(organization_id, id);

      return NextResponse.json({ message: 'User organization updated successfully' });
    }

    if (role) {
      const allowedRoles = ['admin', 'coadmin', 'member', 'limited member'];
      if (!allowedRoles.includes(role)) {
        return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
      }

      const stmt = db.prepare('UPDATE users SET role = ? WHERE id = ?');
      stmt.run(role, id);

      return NextResponse.json({ message: 'User role updated successfully' });
    }

    return NextResponse.json({ message: 'Either role or organization_id must be provided' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { name, email } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ message: 'Name and email are required' }, { status: 400 });
    }

    const stmt = db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?');
    const info = stmt.run(name, email, id);

    if (info.changes === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const info = stmt.run(id);

    if (info.changes === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
