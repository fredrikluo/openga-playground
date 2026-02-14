import { NextResponse, NextRequest } from 'next/server';
import { userRepository, userOrganizationRepository } from '@/lib/repositories';
import { addUserToOrganization, removeUserFromOrganization } from '@/lib/user-organization-helpers';
import { syncUserAddedToOrg, syncUserRemovedFromOrg } from '@/lib/openfga-tuples';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await userRepository.getById(id);

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

    const targetUser = await userRepository.getById(id);
    if (!targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (action === 'add_to_org' && organization_id) {
      try {
        await addUserToOrganization(id, organization_id, role || 'member');
      } catch (orgError: unknown) {
        if (orgError instanceof Error && orgError.message.includes('A user with this name already exists')) {
          return NextResponse.json({ message: orgError.message }, { status: 409 });
        }
        throw orgError;
      }

      await syncUserAddedToOrg(id, organization_id, targetUser.name);
      return NextResponse.json({ message: 'User added to organization' });
    }

    if (action === 'remove_from_org' && organization_id) {
      await removeUserFromOrganization(id, organization_id);
      await syncUserRemovedFromOrg(id, organization_id);
      return NextResponse.json({ message: 'User removed from organization' });
    }

    if (role && organization_id) {
      const allowedRoles = ['admin', 'coadmin', 'member', 'limited member'];
      if (!allowedRoles.includes(role)) {
        return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
      }

      await userOrganizationRepository.updateRole(id, organization_id, role);
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

    const found = await userRepository.update(id, name, email);

    if (!found) {
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

    const user = await userRepository.getById(id);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const orgIds = await userOrganizationRepository.getOrgIdsByUser(id);

    for (const orgId of orgIds) {
      await removeUserFromOrganization(id, orgId);
      await syncUserRemovedFromOrg(id, orgId);
    }

    await userRepository.delete(id);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
