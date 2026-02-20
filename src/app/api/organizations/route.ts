import { NextResponse, NextRequest } from 'next/server';
import db, { generateId } from '@/lib/db';
import { organizationRepository, folderRepository, userRepository } from '@/lib/repositories';
import { addUserToOrganization } from '@/lib/user-organization-helpers';
import { syncOrgCreated, syncUserAddedToOrg } from '@/lib/openfga-tuples';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      const organizations = await organizationRepository.getByUser(userId);
      return NextResponse.json(organizations);
    }

    const organizations = await organizationRepository.getAll();
    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, userId, userRole = 'admin' } = await request.json();
    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    const orgId = generateId();
    const hiddenRootId = generateId();
    const sharedFolderId = generateId();
    const publicFolderId = generateId();

    const newOrg = await db.transaction(async () => {
      await folderRepository.create(hiddenRootId, `${name} Root`, null, null);
      await organizationRepository.create(orgId, name, hiddenRootId);
      await folderRepository.setOrganization(hiddenRootId, orgId);
      await folderRepository.create(sharedFolderId, `${name} Shared Folder`, hiddenRootId, orgId);
      await folderRepository.create(publicFolderId, `${name} Public`, hiddenRootId, orgId);

      return { id: orgId, name, root_folder_id: hiddenRootId };
    });

    await addUserToOrganization(userId, orgId, userRole);
    await syncOrgCreated(orgId, hiddenRootId);
    const creator = await userRepository.getById(userId);
    await syncUserAddedToOrg(userId, orgId, creator?.name || '', userRole);

    return NextResponse.json(newOrg, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
