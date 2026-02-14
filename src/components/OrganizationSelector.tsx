'use client';

import { useUser } from '@/context/UserContext';
import { useOrganization } from '@/context/OrganizationContext';
import { getHeaders } from '@/lib/api';
import { useEffect } from 'react';
import { Organization } from '@/lib/schema';

const OrganizationSelector = () => {
  const { currentUser } = useUser();
  const { organizations, setOrganizations, currentOrganization, setCurrentOrganization } = useOrganization();

  useEffect(() => {
    const fetchUserOrganizations = async () => {
      if (!currentUser) {
        setOrganizations([]);
        setCurrentOrganization(null);
        return;
      }

      try {
        const res = await fetch(`/api/users/${currentUser.id}/organizations`, { headers: getHeaders(currentUser?.id) });
        if (!res.ok) {
          throw new Error('Failed to fetch organizations');
        }
        const data: Organization[] = await res.json();
        setOrganizations(data);

        // Auto-select first org if none selected or current selection is invalid
        if (data.length > 0) {
          const isCurrentValid = currentOrganization && data.some((org) => org.id === currentOrganization.id);

          if (!isCurrentValid) {
            setCurrentOrganization(data[0]);
          }
        } else {
          setCurrentOrganization(null);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
        setOrganizations([]);
        setCurrentOrganization(null);
      }
    };

    fetchUserOrganizations();
  }, [currentUser]); // Only depend on currentUser, not currentOrganization

  const handleSelectOrganization = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const orgId = e.target.value;
    const selectedOrg = organizations.find((org) => org.id === orgId) || null;
    setCurrentOrganization(selectedOrg);
  };

  if (!currentUser) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg shadow-md">
        <label className="block text-lg font-medium text-gray-400 mb-2">Organization:</label>
        <div className="text-gray-500 italic">Please log in to select an organization</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <label htmlFor="org-selector" className="block text-lg font-medium text-gray-700 mb-2">
        Organization:
      </label>
      <select
        id="org-selector"
        value={currentOrganization?.id || ''}
        onChange={handleSelectOrganization}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        disabled={organizations.length === 0}
      >
        {organizations.length === 0 ? (
          <option value="" disabled>
            No organizations available
          </option>
        ) : (
          <>
            <option value="" disabled>
              Select an organization
            </option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </>
        )}
      </select>
      {organizations.length === 0 && (
        <p className="mt-2 text-sm text-gray-500">
          You are not a member of any organization yet. Create one in the Organizations tab.
        </p>
      )}
    </div>
  );
};

export default OrganizationSelector;
