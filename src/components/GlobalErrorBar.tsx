'use client';

import { useError } from '@/context/ErrorContext';

export default function GlobalErrorBar() {
  const { error, clearError } = useError();

  if (!error) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <div className="flex items-center justify-between p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-lg">
        <span className="text-sm">{error}</span>
        <button onClick={clearError} className="ml-3 text-red-500 hover:text-red-700 font-bold text-lg leading-none">&times;</button>
      </div>
    </div>
  );
}
