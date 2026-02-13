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
    const { role, organization_id, action } = await request.json();

    const targetUser = getOne<User>('SELECT * FROM users WHERE id = ?', id);
    if (!targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Add user to organization
    if (action === 'add_to_org' && organization_id) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO user_organizations (user_id, organization_id, role)
        VALUES (?, ?, ?)
      `);
      stmt.run(id, organization_id, role || 'member');
      return NextResponse.json({ message: 'User added to organization' });
    }

    // Remove user from organization
    if (action === 'remove_from_org' && organization_id) {
      const stmt = db.prepare(`
        DELETE FROM user_organizations
        WHERE user_id = ? AND organization_id = ?
      `);
      stmt.run(id, organization_id);
      return NextResponse.json({ message: 'User removed from organization' });
    }

    // Update role within an organization
    if (role && organization_id) {
      const allowedRoles = ['admin', 'coadmin', 'member', 'limited member'];
      if (!allowedRoles.includes(role)) {
        return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
      }

      const stmt = db.prepare(`
        UPDATE user_organizations
        SET role = ?
        WHERE user_id = ? AND organization_id = ?
      `);
      stmt.run(role, id, organization_id);
      return NextResponse.json({ message: 'User role updated' });
    }

    return NextResponse.json({ message: 'Invalid request parameters' }, { status: 400 });
  } catch (error) {
    console.error('Error updating user:', error);
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
