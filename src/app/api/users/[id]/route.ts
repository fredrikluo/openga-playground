import { NextResponse, NextRequest } from 'next/server';
import db, { getOne } from '@/lib/db';
import type { User, Organization, Folder } from '@/lib/schema';
import { addUserToOrganization, removeUserFromOrganization } from '@/lib/user-organization-helpers';
import { writeOrgMemberTuple, deleteOrgMemberTuple, writeFolderTuples } from '@/lib/openfga-tuples';

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
      try {
        addUserToOrganization(Number(id), organization_id, role || 'member');
      } catch (orgError: unknown) {
        if (orgError instanceof Error && orgError.message.includes('A user with this name already exists')) {
          return NextResponse.json({ message: orgError.message }, { status: 409 });
        }
        throw orgError;
      }

      // Sync OpenFGA: org membership + personal folder tuple
      await writeOrgMemberTuple(Number(id), organization_id);
      const org = getOne<Organization>('SELECT root_folder_id FROM organizations WHERE id = ?', organization_id);
      if (org) {
        const personalFolder = getOne<Folder>(
          'SELECT * FROM folders WHERE name = ? AND parent_folder_id = ? AND organization_id = ?',
          targetUser.name, org.root_folder_id, organization_id
        );
        if (personalFolder) {
          await writeFolderTuples(personalFolder.id, organization_id, org.root_folder_id);
        }
      }

      return NextResponse.json({ message: 'User added to organization' });
    }

    // Remove user from organization
    if (action === 'remove_from_org' && organization_id) {
      removeUserFromOrganization(Number(id), organization_id);
      await deleteOrgMemberTuple(Number(id), organization_id);
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

    // Check if user exists
    const user = getOne<User>('SELECT * FROM users WHERE id = ?', id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Get all organizations the user belongs to
    const userOrgs = db.prepare(`
      SELECT organization_id FROM user_organizations WHERE user_id = ?
    `).all(id) as { organization_id: number }[];

    // Remove user from all organizations (this deletes their personal folders)
    for (const org of userOrgs) {
      removeUserFromOrganization(Number(id), org.organization_id);
      await deleteOrgMemberTuple(Number(id), org.organization_id);
    }

    // Now delete the user
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(id);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
