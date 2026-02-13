import { NextResponse } from 'next/server';
import db, { getAll } from '@/lib/db';
import type { Folder } from '@/lib/schema';

export async function GET() {
  try {
    const folders = getAll<Folder>('SELECT * FROM folders');
    return NextResponse.json(folders);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, parent_folder_id } = await request.json();
    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }
    const stmt = db.prepare('INSERT INTO folders (name, parent_folder_id) VALUES (?, ?)');
    const info = stmt.run(name, parent_folder_id);
    return NextResponse.json({ id: info.lastInsertRowid, name, parent_folder_id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}