import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const organization = db.prepare('SELECT * FROM organizations WHERE id = ?').get(id);
    if (!organization) {
      return NextResponse.json({ message: 'Organization not found' }, { status: 404 });
    }
    return NextResponse.json(organization);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
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

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const transaction = db.transaction(() => {
      const org = db.prepare('SELECT root_folder_id FROM organizations WHERE id = ?').get(id);
      if (!org) {
        return { changes: 0 };
      }

      const deleteOrgStmt = db.prepare('DELETE FROM organizations WHERE id = ?');
      const info = deleteOrgStmt.run(id);

      if (info.changes > 0) {
        const deleteFolderStmt = db.prepare('DELETE FROM folders WHERE id = ?');
        deleteFolderStmt.run(org.root_folder_id);
      }

      return info;
    });

    const info = transaction();

    if (info.changes === 0) {
      return NextResponse.json({ message: 'Organization not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}