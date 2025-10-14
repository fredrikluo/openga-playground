import { NextResponse, NextRequest } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { role, currentUserId } = await request.json();

    if (!role || !currentUserId) {
      return NextResponse.json({ message: 'Role and currentUserId are required' }, { status: 400 });
    }

    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(currentUserId);
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

    if (!currentUser || !targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (currentUser.organization_id !== targetUser.organization_id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'coadmin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const allowedRoles = ['admin', 'coadmin', 'member', 'limited member'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
    }

    const stmt = db.prepare('UPDATE users SET role = ? WHERE id = ?');
    const info = stmt.run(role, id);

    if (info.changes === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
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
