import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const kahoots = db.prepare('SELECT * FROM kahoots').all();
    return NextResponse.json(kahoots);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, folder_id } = await request.json();
    if (!name || !folder_id) {
      return NextResponse.json({ message: 'Name and folder_id are required' }, { status: 400 });
    }
    const stmt = db.prepare('INSERT INTO kahoots (name, folder_id) VALUES (?, ?)');
    const info = stmt.run(name, folder_id);
    return NextResponse.json({ id: info.lastInsertRowid, name, folder_id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}