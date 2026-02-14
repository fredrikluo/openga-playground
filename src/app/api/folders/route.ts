import { NextResponse, NextRequest } from 'next/server';
import { generateId } from '@/lib/db';
import { folderRepository } from '@/lib/repositories';
import { writeFolderTuples } from '@/lib/openfga-tuples';

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

export async function POST(request: Request) {
  try {
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

    const folderId = generateId();
    await folderRepository.create(folderId, name, parent_folder_id, orgId);

    await writeFolderTuples(folderId, orgId, parent_folder_id || null);

    return NextResponse.json({ id: folderId, name, parent_folder_id, organization_id: orgId }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ message: 'A folder with this name already exists at this location' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
