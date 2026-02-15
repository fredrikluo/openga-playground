import { NextResponse, NextRequest } from 'next/server';
import { generateId } from '@/lib/db';
import { folderRepository } from '@/lib/repositories';
import { syncFolderCreated, writeFolderTuples } from '@/lib/openfga-tuples';
import { checkWithPolicy as check } from '@/lib/policy';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ message: 'organizationId is required' }, { status: 400 });
    }

    const folders = await folderRepository.getByOrganization(organizationId);
    return NextResponse.json(folders);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getCurrentUserId(request);
    const { name, parent_folder_id, organization_id } = await request.json();
    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }

    let orgId = organization_id;
    if (parent_folder_id) {
      const parentFolder = await folderRepository.getById(parent_folder_id);
      if (parentFolder) {
        orgId = parentFolder.organization_id;
      }
    }

    if (!orgId) {
      return NextResponse.json({ message: 'organization_id is required' }, { status: 400 });
    }

    if (userId && parent_folder_id) {
      const allowed = await check(`user:${userId}`, 'can_create_effective', `folder:${parent_folder_id}`);
      if (!allowed) {
        return NextResponse.json({ message: 'Permission denied: cannot create in this folder' }, { status: 403 });
      }
    }

    const folderId = generateId();
    await folderRepository.create(folderId, name, parent_folder_id, orgId, userId);

    if (userId) {
      await syncFolderCreated(folderId, orgId, parent_folder_id || null, userId);
    } else {
      await writeFolderTuples(folderId, orgId, parent_folder_id || null);
    }

    return NextResponse.json({ id: folderId, name, parent_folder_id, organization_id: orgId, creator_id: userId }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ message: 'A folder with this name already exists at this location' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
