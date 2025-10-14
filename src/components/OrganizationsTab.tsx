'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';

interface Organization {
  id: number;
  name: string;
  root_folder_id: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'coadmin' | 'member' | 'limited member';
}

const OrganizationsTab = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [usersByOrg, setUsersByOrg] = useState<Record<number, User[]>>({});
  const [name, setName] = useState('');
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const { currentUser, refetchUsers } = useUser();
  const [newOrganizationName, setNewOrganizationName] = useState('');
  const [unassignedUsers, setUnassignedUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [addingMemberToOrg, setAddingMemberToOrg] = useState<number | null>(null);

  const fetchUnassignedUsers = async () => {
    const res = await fetch('/api/users?unassigned=true');
    const data = await res.json();
    setUnassignedUsers(data);
  };

  const fetchOrganizations = async () => {
    if (currentUser) {
      const res = await fetch(`/api/organizations?userId=${currentUser.id}`);
      const data = await res.json();
      setOrganizations(data);
      if (data.length > 0) {
        // Fetch users for all organizations
        data.forEach((org: Organization) => fetchUsers(org.id));
      }
    } else {
      setOrganizations([]);
      setUsersByOrg({});
    }
  };

  const fetchUsers = async (organizationId: number) => {
    if (!currentUser) return;
    const res = await fetch(`/api/users?organizationId=${organizationId}&currentUserId=${currentUser.id}`);
    const data = await res.json();
    setUsersByOrg((prev) => ({ ...prev, [organizationId]: data }));
  };

  useEffect(() => {
    fetchOrganizations();
    fetchUnassignedUsers();
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

  const handleRoleChange = async (userId: number, role: string, organizationId: number) => {
    if (!currentUser) return;
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, currentUserId: currentUser.id }),
    });
    fetchUsers(organizationId);
  };

  const resetForm = () => {
    setEditingOrg(null);
    setName('');
  };

  const handleAddMember = async (organizationId: number) => {
    if (!selectedUser || !currentUser) return;

    await fetch(`/api/users/${selectedUser}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organization_id: organizationId, currentUserId: currentUser.id }),
    });

    fetchUsers(organizationId);
    fetchUnassignedUsers();
    setSelectedUser('');
    setAddingMemberToOrg(null);
  };

  const handleRemoveMember = async (userId: number, organizationId: number) => {
    if (!currentUser) return;

    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organization_id: null, currentUserId: currentUser.id }),
    });

    fetchUsers(organizationId);
    fetchUnassignedUsers();
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
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Organizations</h2>
        {currentUser ? (
          organizations.length > 0 ? (
            <div className="space-y-6">
              {organizations.map((org) => (
                <div key={org.id} className="p-4 bg-white rounded-lg shadow-md">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">{org.name}</h3>
                    <div className="flex space-x-2">
                      <button onClick={() => handleEdit(org)} className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition">Edit</button>
                      <button onClick={() => handleDelete(org.id)} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition">Delete</button>
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">Members</h4>
                  <ul className="space-y-3">
                    {(usersByOrg[org.id] || []).map((user) => (
                      <li key={user.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-700">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value, org.id)}
                            className="border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                          >
                            <option value="admin">Admin</option>
                            <option value="coadmin">Coadmin</option>
                            <option value="member">Member</option>
                            <option value="limited member">Limited Member</option>
                          </select>
                          <button onClick={() => handleRemoveMember(user.id, org.id)} className="px-3 py-1 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition">
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4">
                    {addingMemberToOrg === org.id ? (
                      <div className="flex items-center space-x-2">
                        <select
                          value={selectedUser}
                          onChange={(e) => setSelectedUser(e.target.value)}
                          className="border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        >
                          <option value="">Select a user</option>
                          {unassignedUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => handleAddMember(org.id)} className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition">
                          Add
                        </button>
                        <button onClick={() => setAddingMemberToOrg(null)} className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setAddingMemberToOrg(org.id)} className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition">
                        Add Member
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
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