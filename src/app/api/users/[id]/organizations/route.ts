import { NextResponse, NextRequest } from 'next/server';
import { getAll } from '@/lib/db';

interface UserOrganization {
  id: number;
  name: string;
  root_folder_id: number;
  role: string;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const organizations = getAll<UserOrganization>(`
      SELECT o.id, o.name, o.root_folder_id, uo.role
      FROM organizations o
      JOIN user_organizations uo ON o.id = uo.organization_id
      WHERE uo.user_id = ?
      ORDER BY o.name
    `, id);

    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error fetching user organizations:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
