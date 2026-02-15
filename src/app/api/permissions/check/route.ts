import { NextRequest, NextResponse } from 'next/server';
import { checkWithPolicy } from '@/lib/policy';

// Single permission check
// GET /api/permissions/check?user=user:1&relation=can_view_effective&object=folder:5
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get('user');
    const relation = searchParams.get('relation');
    const object = searchParams.get('object');

    if (!user || !relation || !object) {
      return NextResponse.json(
        { message: 'user, relation, and object query params are required' },
        { status: 400 }
      );
    }

    const allowed = await checkWithPolicy(user, relation, object);
    return NextResponse.json({ allowed });
  } catch (error) {
    console.error('Permission check error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// Batch permission check
// POST /api/permissions/check
// Body: { checks: [{ user, relation, object }, ...] }
export async function POST(request: NextRequest) {
  try {
    const { checks } = await request.json();

    if (!checks || !Array.isArray(checks)) {
      return NextResponse.json(
        { message: 'checks array is required' },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      checks.map(async (c: { user: string; relation: string; object: string }) => {
        const allowed = await checkWithPolicy(c.user, c.relation, c.object);
        return { ...c, allowed };
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Batch permission check error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
