import { NextResponse, NextRequest } from 'next/server';
import { organizationRepository } from '@/lib/repositories';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const organizations = await organizationRepository.getByUserWithRole(id);
    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error fetching user organizations:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
