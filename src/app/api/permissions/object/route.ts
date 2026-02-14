import { NextRequest, NextResponse } from 'next/server';
import { check } from '@/lib/openfga';

const FOLDER_PERMISSIONS = [
  'can_view_effective',
  'can_create_effective',
  'can_edit_effective',
  'can_duplicate_effective',
  'can_remove_effective',
  'can_set_visibility_effective',
  'can_lock_effective',
];

const DOCUMENT_PERMISSIONS = [
  'can_view_effective',
  'can_create_effective',
  'can_edit_effective',
  'can_duplicate_effective',
  'can_remove_effective',
  'can_set_visibility_effective',
  'can_lock_effective',
];

// Get all permissions for a user+object combination
// GET /api/permissions/object?user=user:1&object=folder:5
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get('user');
    const object = searchParams.get('object');

    if (!user || !object) {
      return NextResponse.json(
        { message: 'user and object query params are required' },
        { status: 400 }
      );
    }

    const objectType = object.split(':')[0];
    const permissions = objectType === 'document' ? DOCUMENT_PERMISSIONS : FOLDER_PERMISSIONS;

    const results: Record<string, boolean> = {};
    await Promise.all(
      permissions.map(async (perm) => {
        results[perm] = await check(user, perm, object);
      })
    );

    return NextResponse.json({ user, object, permissions: results });
  } catch (error) {
    console.error('Permission object check error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
