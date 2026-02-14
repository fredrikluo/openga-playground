import { NextRequest, NextResponse } from 'next/server';
import { writeTuples, deleteTuples, readTuples } from '@/lib/openfga';

const VALID_ROLES = ['manager', 'editor', 'creator', 'viewer'];

// List current role assignments for an object
// GET /api/permissions/roles?object=folder:5
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const object = searchParams.get('object');

    if (!object) {
      return NextResponse.json(
        { message: 'object query param is required' },
        { status: 400 }
      );
    }

    // Read all role tuples for this object
    const allTuples = [];
    for (const role of VALID_ROLES) {
      const tuples = await readTuples({ relation: role, object });
      allTuples.push(...tuples);
    }

    // Also read shared_with for documents
    if (object.startsWith('document:')) {
      const sharedTuples = await readTuples({ relation: 'shared_with', object });
      allTuples.push(...sharedTuples);
    }

    const assignments = allTuples.map(t => ({
      user: t.key?.user,
      relation: t.key?.relation,
      object: t.key?.object,
    }));

    return NextResponse.json({ object, assignments });
  } catch (error) {
    console.error('Read roles error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// Assign a role to a user/group on an object
// POST /api/permissions/roles
// Body: { user: "user:1", relation: "manager", object: "folder:5" }
//   or: { user: "group:3#member", relation: "viewer", object: "folder:5" }
export async function POST(request: NextRequest) {
  try {
    const { user, relation, object } = await request.json();

    if (!user || !relation || !object) {
      return NextResponse.json(
        { message: 'user, relation, and object are required' },
        { status: 400 }
      );
    }

    const validRelations = [...VALID_ROLES, 'shared_with'];
    if (!validRelations.includes(relation)) {
      return NextResponse.json(
        { message: `Invalid relation. Must be one of: ${validRelations.join(', ')}` },
        { status: 400 }
      );
    }

    await writeTuples([{ user, relation, object }]);

    return NextResponse.json({ message: 'Role assigned', user, relation, object }, { status: 201 });
  } catch (error) {
    console.error('Assign role error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// Remove a role assignment
// DELETE /api/permissions/roles
// Body: { user: "user:1", relation: "manager", object: "folder:5" }
export async function DELETE(request: NextRequest) {
  try {
    const { user, relation, object } = await request.json();

    if (!user || !relation || !object) {
      return NextResponse.json(
        { message: 'user, relation, and object are required' },
        { status: 400 }
      );
    }

    await deleteTuples([{ user, relation, object }]);

    return NextResponse.json({ message: 'Role removed', user, relation, object });
  } catch (error) {
    console.error('Remove role error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
