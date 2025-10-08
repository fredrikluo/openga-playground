'use client';

import { useState, useEffect } from 'react';

interface Organization {
  id: number;
  name: string;
  root_folder_id: number;
}

const OrganizationsTab = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [name, setName] = useState('');
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    const res = await fetch('/api/organizations');
    const data = await res.json();
    setOrganizations(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOrg) {
      await fetch(`/api/organizations/${editingOrg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
    } else {
      await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
    }
    resetForm();
    fetchOrganizations();
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
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{editingOrg ? 'Edit Organization' : 'Add a New Organization'}</h2>
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 rounded-lg shadow-sm space-y-4">
          <input
            type="text"
            placeholder="Organization Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            required
          />
          <div className="flex justify-end space-x-3">
            {editingOrg && <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition">Cancel</button>}
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">{editingOrg ? 'Update Organization' : 'Add Organization'}</button>
          </div>
        </form>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Current Organizations</h2>
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
      </div>
    </div>
  );
};

export default OrganizationsTab;