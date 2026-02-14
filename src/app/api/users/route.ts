import { NextResponse, NextRequest } from 'next/server';
import { generateId } from '@/lib/db';
import { userRepository } from '@/lib/repositories';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const unassigned = searchParams.get('unassigned');

    if (unassigned === 'true') {
      const users = await userRepository.getUnassigned();
      return NextResponse.json(users);
    }

    if (organizationId) {
      const users = await userRepository.getByOrganization(organizationId);
      return NextResponse.json(users);
    }

    const users = await userRepository.getAll();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, email } = await request.json();
    if (!name || !email) {
      return NextResponse.json({ message: 'Name and email are required' }, { status: 400 });
    }

    const userId = generateId();
    await userRepository.create(userId, name, email);

    return NextResponse.json({ id: userId, name, email }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ message: 'A user with this email already exists' }, { status: 409 });
    }
    // Postgres unique violation
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json({ message: 'A user with this email already exists' }, { status: 409 });
    }
    console.error('Error creating user:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
