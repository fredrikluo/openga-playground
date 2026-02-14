import { NextResponse } from 'next/server';
import db, { getAll, generateId } from '@/lib/db';
import type { Kahoot } from '@/lib/schema';
import { syncKahootCreated } from '@/lib/openfga-tuples';

export async function GET() {
  try {
    const kahoots = getAll<Kahoot>('SELECT * FROM kahoots');
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

    const kahootId = generateId();
    db.prepare('INSERT INTO kahoots (id, name, folder_id) VALUES (?, ?, ?)').run(kahootId, name, folder_id);

    await syncKahootCreated(kahootId, folder_id);

    return NextResponse.json({ id: kahootId, name, folder_id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
