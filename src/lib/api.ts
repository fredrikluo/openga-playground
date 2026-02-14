'use client';

export function apiHeaders(userId: string | undefined): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (userId) {
    headers['X-User-Id'] = userId;
  }
  return headers;
}

export function getHeaders(userId: string | undefined): HeadersInit {
  const headers: Record<string, string> = {};
  if (userId) {
    headers['X-User-Id'] = userId;
  }
  return headers;
}
