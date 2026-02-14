import { NextRequest } from 'next/server';

export function getCurrentUserId(request: NextRequest): string | null {
  return request.headers.get('X-User-Id');
}
