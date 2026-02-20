import { NextResponse } from 'next/server';
import { readTuples } from '@/lib/openfga';
import { folderRepository, kahootRepository, userRepository, organizationRepository } from '@/lib/repositories';

interface SharedItem {
  id: string;
  name: string;
  relation: string;
  owner: string | null;
  orgName?: string;
}

// GET /api/users/:id/shared — list all folders/kahoots directly shared with this user
// Optional query param: organizationId — filter to items in this org only
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const user = `user:${id}`;

    // OpenFGA read requires object type — omit relation to get all roles in one call per type
    const [folderTuples, docTuples] = await Promise.all([
      readTuples({ user, object: 'folder:' }),
      readTuples({ user, object: 'document:' }),
    ]);

    const folders: SharedItem[] = [];
    for (const tuple of folderTuples) {
      const object = tuple.key?.object;
      const relation = tuple.key?.relation;
      if (!object || !relation) continue;
      const folderId = object.replace('folder:', '');
      const folder = await folderRepository.getById(folderId);
      if (!folder || !folder.creator_id || folder.creator_id === id) continue;
      if (organizationId && folder.organization_id !== organizationId) continue;
      const owner = await userRepository.getById(folder.creator_id);
      const item: SharedItem = { id: folder.id, name: folder.name, relation, owner: owner?.name ?? null };
      if (!organizationId) {
        const org = await organizationRepository.getById(folder.organization_id);
        item.orgName = org?.name;
      }
      folders.push(item);
    }

    const kahoots: SharedItem[] = [];
    for (const tuple of docTuples) {
      const object = tuple.key?.object;
      const relation = tuple.key?.relation;
      if (!object || !relation) continue;
      const docId = object.replace('document:', '');
      const kahoot = await kahootRepository.getById(docId);
      if (!kahoot || !kahoot.creator_id || kahoot.creator_id === id) continue;
      const parentFolder = await folderRepository.getById(kahoot.folder_id);
      if (organizationId) {
        if (!parentFolder || parentFolder.organization_id !== organizationId) continue;
      }
      const owner = await userRepository.getById(kahoot.creator_id);
      const item: SharedItem = { id: kahoot.id, name: kahoot.name, relation, owner: owner?.name ?? null };
      if (!organizationId && parentFolder) {
        const org = await organizationRepository.getById(parentFolder.organization_id);
        item.orgName = org?.name;
      }
      kahoots.push(item);
    }

    return NextResponse.json({ folders, kahoots });
  } catch (error) {
    console.error('Error fetching user shared items:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
