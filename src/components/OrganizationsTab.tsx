'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';

interface Organization {
  id: number;
  name: string;
  root_folder_id: number;
}

const OrganizationsTab = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [name, setName] = useState('');
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const { currentUser, refetchUsers } = useUser();
  const [newOrganizationName, setNewOrganizationName] = useState('');

  const fetchOrganizations = async () => {
    if (currentUser) {
      const res = await fetch(`/api/organizations?userId=${currentUser.id}`);
      const data = await res.json();
      setOrganizations(data);
    } else {
      setOrganizations([]);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [currentUser]);

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOrg) {
      await fetch(`/api/organizations/${editingOrg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      resetForm();
      fetchOrganizations();
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser) {
      await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newOrganizationName, userId: currentUser.id }),
      });
      setNewOrganizationName('');
      fetchOrganizations();
      refetchUsers();
    }
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setName(org.name);
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/organizations/${id}`, {
      method: 'DELETE',
    });
    fetchOrganizations();
  };

  const resetForm = () => {
    setEditingOrg(null);
    setName('');
  };

  return (
    <div className="space-y-6">
      {editingOrg && (
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Edit Organization</h2>
          <form onSubmit={handleUpdateSubmit} className="p-4 bg-gray-50 rounded-lg shadow-sm space-y-4">
            <input
              type="text"
              placeholder="Organization Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
            />
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">Update Organization</button>
            </div>
          </form>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Current Organization</h2>
        {currentUser ? (
          organizations.length > 0 ? (
            <ul className="space-y-3">
              {organizations.map((org) => (
                <li key={org.id} className="flex justify-between items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition">
                  <p className="font-semibold text-gray-700">{org.name}</p>
                  <div className="flex space-x-2">
                    <button onClick={() => handleEdit(org)} className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition">Edit</button>
                    <button onClick={() => handleDelete(org.id)} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition">Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div>
              <p className="text-gray-500 mb-4">No organization associated with this user. Create one below.</p>
              <form onSubmit={handleCreateSubmit} className="p-4 bg-gray-50 rounded-lg shadow-sm space-y-4">
                <input
                  type="text"
                  placeholder="New Organization Name"
                  value={newOrganizationName}
                  onChange={(e) => setNewOrganizationName(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                />
                <div className="flex justify-end">
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">Create Organization</button>
                </div>
              </form>
            </div>
          )
        ) : (
          <p className="text-gray-500">Please select a user to view their organization.</p>
        )}
      </div>
    </div>
  );
};

export default OrganizationsTab;