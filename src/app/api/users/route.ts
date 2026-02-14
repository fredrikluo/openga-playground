import { NextResponse, NextRequest } from 'next/server';
import db, { generateId } from '@/lib/db';
import { userRepository, organizationRepository, folderRepository } from '@/lib/repositories';
import { addUserToOrganization } from '@/lib/user-organization-helpers';
import { syncOrgCreated, syncUserAddedToOrg } from '@/lib/openfga-tuples';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const unassigned = searchParams.get('unassigned');

    if (unassigned === 'true') {
      const users = await userRepository.getUnassigned();
      return NextResponse.json(users);
    }

    if (organizationId) {
      const users = await userRepository.getByOrganization(organizationId);
      return NextResponse.json(users);
    }

    const users = await userRepository.getAll();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, organizationId, role = 'member', newOrganization } = await request.json();
    if (!name || !email) {
      return NextResponse.json({ message: 'Name and email are required' }, { status: 400 });
    }

    let orgId = organizationId;

    // If creating a new organization
    if (newOrganization) {
      const newOrgId = generateId();
      const hiddenRootId = generateId();
      const sharedFolderId = generateId();

      const result = await db.transaction(async () => {
        await folderRepository.create(hiddenRootId, `${newOrganization} Root`, null, null);
        await organizationRepository.create(newOrgId, newOrganization, hiddenRootId);
        await folderRepository.setOrganization(hiddenRootId, newOrgId);
        await folderRepository.create(sharedFolderId, `${newOrganization} Shared Folder`, hiddenRootId, newOrgId);

        return { orgId: newOrgId, rootFolderId: hiddenRootId };
      });
      orgId = result.orgId;
    }

    // Create user
    const userId = generateId();
    await userRepository.create(userId, name, email);
    const newUser = { id: userId, name, email };

    // Add to organization if provided (this creates the personal folder)
    if (orgId) {
      try {
        await addUserToOrganization(userId, orgId, role);
      } catch (orgError: unknown) {
        if (orgError instanceof Error && orgError.message.includes('A user with this name already exists')) {
          await userRepository.delete(userId);
          return NextResponse.json({ message: orgError.message }, { status: 409 });
        }
        throw orgError;
      }

      if (newOrganization) {
        const org = await organizationRepository.getById(orgId);
        if (org) {
          await syncOrgCreated(orgId, org.root_folder_id, userId);
        }
      } else {
        await syncUserAddedToOrg(userId, orgId, name);
      }
    }
    return NextResponse.json(newUser, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ message: 'A user with this email already exists' }, { status: 409 });
    }
    console.error('Error creating user:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
