'use client';

import { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Organization } from '@/lib/schema';

interface OrganizationContextType {
  currentOrganization: Organization | null;
  setCurrentOrganization: (org: Organization | null) => void;
  organizations: Organization[];
  setOrganizations: (orgs: Organization[]) => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('currentOrganization');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCurrentOrganizationState(parsed);
      } catch (e) {
        console.error('Failed to parse stored organization:', e);
        localStorage.removeItem('currentOrganization');
      }
    }
  }, []);

  // Save to localStorage when changed
  const setCurrentOrganization = (org: Organization | null) => {
    setCurrentOrganizationState(org);
    if (org) {
      localStorage.setItem('currentOrganization', JSON.stringify(org));
    } else {
      localStorage.removeItem('currentOrganization');
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        setCurrentOrganization,
        organizations,
        setOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
