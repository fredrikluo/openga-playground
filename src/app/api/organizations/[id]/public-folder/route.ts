import { NextResponse } from 'next/server';
import { generateId } from '@/lib/db';
import { organizationRepository, folderRepository } from '@/lib/repositories';
import { writeTuplesStrict, deleteTuplesStrict, readTuples } from '@/lib/openfga';
import { writeFolderTuples } from '@/lib/openfga-tuples';

// GET — check if public folder is enabled
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const org = await organizationRepository.getById(id);
    if (!org) {
      return NextResponse.json({ message: 'Organization not found' }, { status: 404 });
    }

    const publicFolder = await folderRepository.getPublicFolder(org.root_folder_id, id);
    if (!publicFolder) {
      return NextResponse.json({ enabled: false, folderId: null });
    }

    // Check if user:* public_viewer tuple exists
    const tuples = await readTuples({
      user: 'user:*',
      relation: 'public_viewer',
      object: `folder:${publicFolder.id}`,
    });

    return NextResponse.json({
      enabled: tuples.length > 0,
      folderId: publicFolder.id,
    });
  } catch (error) {
    console.error('Error checking public folder:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST — enable public folder (create if missing + write user:* tuple)
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const org = await organizationRepository.getById(id);
    if (!org) {
      return NextResponse.json({ message: 'Organization not found' }, { status: 404 });
    }

    let publicFolder = await folderRepository.getPublicFolder(org.root_folder_id, id);

    // Create public folder if it doesn't exist
    if (!publicFolder) {
      const folderId = generateId();
      await folderRepository.create(folderId, `${org.name} Public`, org.root_folder_id, id);
      await writeFolderTuples(folderId, id, org.root_folder_id);
      publicFolder = await folderRepository.getById(folderId);
    }

    if (!publicFolder) {
      return NextResponse.json({ message: 'Failed to create public folder' }, { status: 500 });
    }

    // Write user:* public_viewer tuple
    await writeTuplesStrict([
      { user: 'user:*', relation: 'public_viewer', object: `folder:${publicFolder.id}` },
    ]);

    return NextResponse.json({ enabled: true, folderId: publicFolder.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('Error enabling public folder:', error);
    return NextResponse.json({ message: `Failed to enable public folder: ${message}` }, { status: 500 });
  }
}

// DELETE — disable public folder (remove user:* tuple, keep folder)
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const org = await organizationRepository.getById(id);
    if (!org) {
      return NextResponse.json({ message: 'Organization not found' }, { status: 404 });
    }

    const publicFolder = await folderRepository.getPublicFolder(org.root_folder_id, id);
    if (!publicFolder) {
      return NextResponse.json({ enabled: false, folderId: null });
    }

    // Remove user:* public_viewer tuple
    await deleteTuplesStrict([
      { user: 'user:*', relation: 'public_viewer', object: `folder:${publicFolder.id}` },
    ]);

    return NextResponse.json({ enabled: false, folderId: publicFolder.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('Error disabling public folder:', error);
    return NextResponse.json({ message: `Failed to disable public folder: ${message}` }, { status: 500 });
  }
}
