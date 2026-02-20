'use client';

import { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface ErrorContextType {
  error: string;
  setError: (message: string) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextType>({
  error: '',
  setError: () => {},
  clearError: () => {},
});

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [error, setErrorState] = useState('');

  const setError = useCallback((message: string) => {
    setErrorState(message);
  }, []);

  const clearError = useCallback(() => {
    setErrorState('');
  }, []);

  return (
    <ErrorContext.Provider value={{ error, setError, clearError }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  return useContext(ErrorContext);
}
