'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/context/UserContext';
import { useOrganization } from '@/context/OrganizationContext';

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
  const [editingOrgId, setEditingOrgId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const { currentUser, refetchUsers } = useUser();
  const { setOrganizations: setGlobalOrganizations, currentOrganization, setCurrentOrganization } = useOrganization();
  const [newOrganizationName, setNewOrganizationName] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [addingMemberToOrg, setAddingMemberToOrg] = useState<number | null>(null);
  const [pageByOrg, setPageByOrg] = useState<Record<number, number>>({});
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [selectedOrgToJoin, setSelectedOrgToJoin] = useState<string>('');

  const fetchAllUsers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    setAllUsers(data);
  };

  const fetchAllOrganizations = async () => {
    const res = await fetch('/api/organizations');
    const data = await res.json();
    setAllOrganizations(data);
  };

  const fetchOrgUsers = useCallback(async (organizationId: number) => {
    if (!currentUser) return;
    const res = await fetch(`/api/users?organizationId=${organizationId}`);
    const data = await res.json();
    setUsersByOrg((prev) => ({ ...prev, [organizationId]: data }));
  }, [currentUser]);

  const fetchOrganizations = useCallback(async () => {
    if (currentUser) {
      const res = await fetch(`/api/organizations?userId=${currentUser.id}`);
      const data = await res.json();
      setOrganizations(data);
      data.forEach((org: Organization) => fetchOrgUsers(org.id));
    } else {
      setOrganizations([]);
      setUsersByOrg({});
    }
  }, [currentUser, fetchOrgUsers]);

  useEffect(() => {
    fetchOrganizations();
    fetchAllUsers();
    fetchAllOrganizations();
  }, [fetchOrganizations]);

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

  const handleRename = async (org: Organization) => {
    if (!editName.trim()) return;
    await fetch(`/api/organizations/${org.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    });
    setEditingOrgId(null);
    setEditName('');
    fetchOrganizations();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/organizations/${id}`, { method: 'DELETE' });

    // If current user deleted their currently selected org, switch to another org
    if (currentUser && currentOrganization?.id === id) {
      const updatedOrgs = organizations.filter(o => o.id !== id);
      setGlobalOrganizations(updatedOrgs);
      setCurrentOrganization(updatedOrgs.length > 0 ? updatedOrgs[0] : null);
    } else if (currentUser) {
      // Update global organizations list even if not current org
      const res = await fetch(`/api/users/${currentUser.id}/organizations`);
      const userOrgs = await res.json();
      setGlobalOrganizations(userOrgs);
    }

    fetchOrganizations();
    fetchAllOrganizations();
  };

  const handleRoleChange = async (userId: number, role: string, organizationId: number) => {
    if (!currentUser) return;
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, organization_id: organizationId }),
    });
    fetchOrgUsers(organizationId);
  };

  const handleAddMember = async (organizationId: number) => {
    if (!selectedUser || !currentUser) return;
    await fetch(`/api/users/${selectedUser}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_to_org',
        organization_id: organizationId,
        role: 'member'
      }),
    });
    fetchOrgUsers(organizationId);
    fetchAllUsers();
    refetchUsers();
    setSelectedUser('');
    setAddingMemberToOrg(null);
  };

  const handleRemoveMember = async (userId: number, organizationId: number) => {
    if (!currentUser) return;
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'remove_from_org',
        organization_id: organizationId
      }),
    });
    fetchOrgUsers(organizationId);
    fetchAllUsers();
    refetchUsers();

    // If current user left their currently selected org, switch to another org
    if (userId === currentUser.id && currentOrganization?.id === organizationId) {
      const updatedOrgs = organizations.filter(o => o.id !== organizationId);
      setGlobalOrganizations(updatedOrgs);
      setCurrentOrganization(updatedOrgs.length > 0 ? updatedOrgs[0] : null);
    }

    fetchOrganizations();
  };

  const handleJoinOrganization = async () => {
    if (!selectedOrgToJoin || !currentUser) return;
    await fetch(`/api/users/${currentUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_to_org',
        organization_id: selectedOrgToJoin,
        role: 'member'
      }),
    });
    setSelectedOrgToJoin('');
    fetchOrganizations();
    fetchAllOrganizations();

    // Update global organizations list
    const res = await fetch(`/api/users/${currentUser.id}/organizations`);
    const userOrgs = await res.json();
    setGlobalOrganizations(userOrgs);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Organizations</h2>

        {/* Create Organization Form - Always visible */}
        {currentUser && (
          <form onSubmit={handleCreateSubmit} className="p-4 bg-blue-50 rounded-lg shadow-sm mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Create New Organization</h3>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Organization Name"
                value={newOrganizationName}
                onChange={(e) => setNewOrganizationName(e.target.value)}
                className="flex-1 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition whitespace-nowrap"
              >
                Create Organization
              </button>
            </div>
          </form>
        )}

        {/* Join Organization Form */}
        {currentUser && allOrganizations.filter(org => !organizations.some(o => o.id === org.id)).length > 0 && (
          <div className="p-4 bg-green-50 rounded-lg shadow-sm mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Join Existing Organization</h3>
            <div className="flex gap-3">
              <select
                value={selectedOrgToJoin}
                onChange={(e) => setSelectedOrgToJoin(e.target.value)}
                className="flex-1 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              >
                <option value="" disabled>Select an organization to join</option>
                {allOrganizations
                  .filter(org => !organizations.some(o => o.id === org.id))
                  .map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
              </select>
              <button
                onClick={handleJoinOrganization}
                disabled={!selectedOrgToJoin}
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join Organization
              </button>
            </div>
          </div>
        )}

        {currentUser ? (
          organizations.length > 0 ? (
            <div className="space-y-6">
              {organizations.map((org) => {
                const members = usersByOrg[org.id] || [];
                const PAGE_SIZE = 5;
                const page = pageByOrg[org.id] || 0;
                const totalPages = Math.ceil(members.length / PAGE_SIZE);
                const pagedMembers = members.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
                return (
                  <div key={org.id} className="p-4 bg-white rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-3">
                      {editingOrgId === org.id ? (
                        <div className="flex items-center space-x-2 flex-1 mr-4">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            autoFocus
                          />
                          <button onClick={() => handleRename(org)} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">Save</button>
                          <button onClick={() => setEditingOrgId(null)} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition">Cancel</button>
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">{org.name}</h3>
                          <p className="text-sm text-gray-500">{members.length} member{members.length !== 1 ? 's' : ''}</p>
                        </div>
                      )}
                      {editingOrgId !== org.id && (
                        <div className="flex space-x-2">
                          <button onClick={() => { setEditingOrgId(org.id); setEditName(org.name); }} className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition">Rename</button>
                          <button onClick={() => handleDelete(org.id)} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition">Delete</button>
                        </div>
                      )}
                    </div>

                    {members.length > 0 && (
                      <>
                        <ul className="space-y-2 mb-3">
                          {pagedMembers.map((user) => (
                            <li key={user.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-700">{user.name}</p>
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
                                <button
                                  onClick={() => handleRemoveMember(user.id, org.id)}
                                  className="px-3 py-1 text-sm bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200 transition"
                                >
                                  {user.id === currentUser?.id ? 'Leave' : 'Remove'}
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between mb-3">
                            <button
                              onClick={() => setPageByOrg(prev => ({ ...prev, [org.id]: page - 1 }))}
                              disabled={page === 0}
                              className="px-3 py-1 text-sm font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300"
                            >
                              Previous
                            </button>
                            <span className="text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
                            <button
                              onClick={() => setPageByOrg(prev => ({ ...prev, [org.id]: page + 1 }))}
                              disabled={page >= totalPages - 1}
                              className="px-3 py-1 text-sm font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {addingMemberToOrg === org.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Search users by name or email..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                        <div className="flex items-center space-x-2">
                          <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="flex-1 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            size={Math.min(allUsers.filter((user) => {
                              const isNotMember = !members.some(m => m.id === user.id);
                              const matchesSearch = user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                user.email.toLowerCase().includes(userSearchQuery.toLowerCase());
                              return isNotMember && matchesSearch;
                            }).length + 1, 6)}
                          >
                            <option value="" disabled>
                              {userSearchQuery ? 'Matching users:' : 'Select a user'}
                            </option>
                            {allUsers
                              .filter((user) => {
                                const isNotMember = !members.some(m => m.id === user.id);
                                const matchesSearch = user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                  user.email.toLowerCase().includes(userSearchQuery.toLowerCase());
                                return isNotMember && matchesSearch;
                              })
                              .map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.name} ({user.email})
                                </option>
                              ))}
                          </select>
                          <button
                            onClick={() => handleAddMember(org.id)}
                            disabled={!selectedUser}
                            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => {
                              setAddingMemberToOrg(null);
                              setSelectedUser('');
                              setUserSearchQuery('');
                            }}
                            className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      allUsers.filter(u => !members.some(m => m.id === u.id)).length > 0 && (
                        <button
                          onClick={() => setAddingMemberToOrg(org.id)}
                          className="px-4 py-2 text-sm bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                        >
                          + Add Member
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center p-8 bg-gray-50 rounded-lg">
              You are not a member of any organizations yet. Create one using the form above.
            </p>
          )
        ) : (
          <p className="text-gray-500">Please select a user to view their organization.</p>
        )}
      </div>
    </div>
  );
};

export default OrganizationsTab;
