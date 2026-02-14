import { NextResponse } from 'next/server';
import db, { getOne, getAll } from '@/lib/db';
import type { Organization } from '@/lib/schema';
import { deleteOrgMemberTuple } from '@/lib/openfga-tuples';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const organization = getOne<Organization>('SELECT * FROM organizations WHERE id = ?', id);
    if (!organization) {
      return NextResponse.json({ message: 'Organization not found' }, { status: 404 });
    }
    return NextResponse.json(organization);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { name } = await request.json();
    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }
    const stmt = db.prepare('UPDATE organizations SET name = ? WHERE id = ?');
    const info = stmt.run(name, id);
    if (info.changes === 0) {
      return NextResponse.json({ message: 'Organization not found' }, { status: 404 });
    }
    return NextResponse.json({ id, name });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    // Collect org members before deletion for tuple cleanup
    const orgMembers = getAll<{ user_id: number }>(
      'SELECT user_id FROM user_organizations WHERE organization_id = ?', id
    );

    const transaction = db.transaction(() => {
      const org = getOne<Organization>('SELECT * FROM organizations WHERE id = ?', id);
      if (!org) {
        return { changes: 0 };
      }

      // Delete in proper order to avoid foreign key constraints:
      // Note: There's a circular reference between organizations.root_folder_id and folders.organization_id

      // 1. Delete all kahoots in folders belonging to this organization
      db.prepare(`
        DELETE FROM kahoots
        WHERE folder_id IN (
          SELECT id FROM folders WHERE organization_id = ?
        )
      `).run(id);

      // 2. Break the circular reference by setting root_folder_id to NULL
      db.prepare('UPDATE organizations SET root_folder_id = NULL WHERE id = ?').run(id);

      // 3. Delete all folders belonging to this organization (now safe)
      db.prepare('DELETE FROM folders WHERE organization_id = ?').run(id);

      // 4. Delete all groups belonging to this organization
      db.prepare('DELETE FROM groups WHERE organization_id = ?').run(id);

      // 5. user_organizations will auto-delete due to ON DELETE CASCADE

      // 6. Finally delete the organization
      const info = db.prepare('DELETE FROM organizations WHERE id = ?').run(id);

      return info;
    });

    const info = transaction();

    if (info.changes === 0) {
      return NextResponse.json({ message: 'Organization not found' }, { status: 404 });
    }

    // Clean up org member tuples in OpenFGA
    for (const member of orgMembers) {
      await deleteOrgMemberTuple(member.user_id, Number(id));
    }

    return NextResponse.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}