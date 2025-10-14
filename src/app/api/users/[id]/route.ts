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
    const { role, organization_id, currentUserId } = await request.json();

    if (!currentUserId) {
      return NextResponse.json({ message: 'currentUserId is required' }, { status: 400 });
    }

    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(currentUserId);
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

    if (!currentUser || !targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'coadmin') {
      return NextResponse.json({ message: 'Forbidden: only admins or co-admins can perform this action' }, { status: 403 });
    }

    if (organization_id !== undefined) {
      const orgToAuthorize = organization_id !== null ? organization_id : targetUser.organization_id;
      if (currentUser.organization_id !== orgToAuthorize) {
        return NextResponse.json({ message: 'Forbidden: You can only manage users in your own organization.' }, { status: 403 });
      }

      const stmt = db.prepare('UPDATE users SET organization_id = ? WHERE id = ?');
      stmt.run(organization_id, id);

      return NextResponse.json({ message: 'User organization updated successfully' });
    }

    if (role) {
      if (currentUser.organization_id !== targetUser.organization_id) {
        return NextResponse.json({ message: 'Forbidden: Cannot change roles for users in other organizations' }, { status: 403 });
      }

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
