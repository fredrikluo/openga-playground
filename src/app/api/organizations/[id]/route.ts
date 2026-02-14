import { NextResponse } from 'next/server';
import db, { getOne, getAll } from '@/lib/db';
import type { Organization } from '@/lib/schema';
import { syncOrgDeleted } from '@/lib/openfga-tuples';

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

    const orgMembers = getAll<{ user_id: string }>(
      'SELECT user_id FROM user_organizations WHERE organization_id = ?', id
    );

    const transaction = db.transaction(() => {
      const org = getOne<Organization>('SELECT * FROM organizations WHERE id = ?', id);
      if (!org) {
        return { changes: 0 };
      }

      db.prepare(`
        DELETE FROM kahoots WHERE folder_id IN (SELECT id FROM folders WHERE organization_id = ?)
      `).run(id);
      db.prepare('UPDATE organizations SET root_folder_id = NULL WHERE id = ?').run(id);
      db.prepare('DELETE FROM folders WHERE organization_id = ?').run(id);
      db.prepare('DELETE FROM groups WHERE organization_id = ?').run(id);
      const info = db.prepare('DELETE FROM organizations WHERE id = ?').run(id);
      return info;
    });

    const info = transaction();
    if (info.changes === 0) {
      return NextResponse.json({ message: 'Organization not found' }, { status: 404 });
    }

    await syncOrgDeleted(id, orgMembers.map(m => m.user_id));

    return NextResponse.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
