import { NextResponse } from 'next/server';
import { readTuples } from '@/lib/openfga';
import { folderRepository, kahootRepository } from '@/lib/repositories';

// GET /api/groups/:id/shared — list all folders/kahoots directly shared with this group
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = `group:${id}#member`;

    // OpenFGA read requires object type — omit relation to get all roles in one call per type
    const [folderTuples, docTuples] = await Promise.all([
      readTuples({ user, object: 'folder:' }),
      readTuples({ user, object: 'document:' }),
    ]);

    const folders: { id: string; name: string; relation: string }[] = [];
    for (const tuple of folderTuples) {
      const object = tuple.key?.object;
      const relation = tuple.key?.relation;
      if (!object || !relation) continue;
      const folderId = object.replace('folder:', '');
      const folder = await folderRepository.getById(folderId);
      if (folder) {
        folders.push({ id: folder.id, name: folder.name, relation });
      }
    }

    const kahoots: { id: string; name: string; relation: string }[] = [];
    for (const tuple of docTuples) {
      const object = tuple.key?.object;
      const relation = tuple.key?.relation;
      if (!object || !relation) continue;
      const docId = object.replace('document:', '');
      const kahoot = await kahootRepository.getById(docId);
      if (kahoot) {
        kahoots.push({ id: kahoot.id, name: kahoot.name, relation });
      }
    }

    return NextResponse.json({ folders, kahoots });
  } catch (error) {
    console.error('Error fetching group shared items:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
