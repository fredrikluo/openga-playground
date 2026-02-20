import { NextResponse } from 'next/server';
import { readTuples } from '@/lib/openfga';
import { folderRepository, kahootRepository, userRepository, groupRepository } from '@/lib/repositories';

// GET /api/groups/:id/shared — list all folders/kahoots directly shared with this group
// Filtered to the group's organization only
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = `group:${id}#member`;

    const group = await groupRepository.getById(id);
    const orgId = group?.organization_id;

    // OpenFGA read requires object type — omit relation to get all roles in one call per type
    const [folderTuples, docTuples] = await Promise.all([
      readTuples({ user, object: 'folder:' }),
      readTuples({ user, object: 'document:' }),
    ]);

    const folders: { id: string; name: string; relation: string; owner: string | null }[] = [];
    for (const tuple of folderTuples) {
      const object = tuple.key?.object;
      const relation = tuple.key?.relation;
      if (!object || !relation) continue;
      const folderId = object.replace('folder:', '');
      const folder = await folderRepository.getById(folderId);
      if (!folder) continue;
      if (orgId && folder.organization_id !== orgId) continue;
      const owner = folder.creator_id ? await userRepository.getById(folder.creator_id) : null;
      folders.push({ id: folder.id, name: folder.name, relation, owner: owner?.name ?? null });
    }

    const kahoots: { id: string; name: string; relation: string; owner: string | null }[] = [];
    for (const tuple of docTuples) {
      const object = tuple.key?.object;
      const relation = tuple.key?.relation;
      if (!object || !relation) continue;
      const docId = object.replace('document:', '');
      const kahoot = await kahootRepository.getById(docId);
      if (!kahoot) continue;
      if (orgId) {
        const parentFolder = await folderRepository.getById(kahoot.folder_id);
        if (!parentFolder || parentFolder.organization_id !== orgId) continue;
      }
      const owner = kahoot.creator_id ? await userRepository.getById(kahoot.creator_id) : null;
      kahoots.push({ id: kahoot.id, name: kahoot.name, relation, owner: owner?.name ?? null });
    }

    return NextResponse.json({ folders, kahoots });
  } catch (error) {
    console.error('Error fetching group shared items:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
