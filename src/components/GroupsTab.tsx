'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/context/UserContext';
import { useOrganization } from '@/context/OrganizationContext';
import { apiHeaders, getHeaders } from '@/lib/api';

interface Group {
  id: string;
  name: string;
  organization_id: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  organization_id: string;
}

const GroupsTab = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [membersByGroup, setMembersByGroup] = useState<Record<string, User[]>>({});
  const [addingMemberToGroup, setAddingMemberToGroup] = useState<string | null>(null);
  const [selectedNewMemberId, setSelectedNewMemberId] = useState<string>('');
  const [pageByGroup, setPageByGroup] = useState<Record<string, number>>({});
  const { currentUser } = useUser();
  const { currentOrganization } = useOrganization();
  const [orgUsers, setOrgUsers] = useState<User[]>([]);

  const fetchGroupMembers = useCallback(async (groupId: string) => {
    const res = await fetch(`/api/groups/${groupId}`, { headers: getHeaders(currentUser?.id) });
    const data = await res.json();
    setMembersByGroup(prev => ({ ...prev, [groupId]: data.users || [] }));
  }, [currentUser]);

  const fetchGroups = useCallback(async () => {
    if (currentOrganization) {
      const res = await fetch(`/api/groups?organizationId=${currentOrganization.id}`, { headers: getHeaders(currentUser?.id) });
      const data: Group[] = await res.json();
      setGroups(data);
      data.forEach(group => fetchGroupMembers(group.id));
    } else {
      setGroups([]);
      setMembersByGroup({});
    }
  }, [currentOrganization, currentUser, fetchGroupMembers]);

  const fetchOrgUsers = useCallback(async () => {
    if (!currentOrganization) return;
    const res = await fetch(`/api/users?organizationId=${currentOrganization.id}`, { headers: getHeaders(currentUser?.id) });
    const data = await res.json();
    setOrgUsers(data);
  }, [currentOrganization, currentUser]);

  useEffect(() => {
    fetchGroups();
    fetchOrgUsers();
  }, [fetchGroups, fetchOrgUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    await fetch('/api/groups', {
      method: 'POST',
      headers: apiHeaders(currentUser?.id),
      body: JSON.stringify({
        name,
        organization_id: currentOrganization.id,
        user_ids: selectedUserIds,
      }),
    });
    setName('');
    setSelectedUserIds([]);
    fetchGroups();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/groups/${id}`, { method: 'DELETE', headers: getHeaders(currentUser?.id) });
    fetchGroups();
  };

  const handleRemoveMember = async (group: Group, userId: string) => {
    const currentMembers = membersByGroup[group.id] || [];
    const updatedIds = currentMembers.filter(u => u.id !== userId).map(u => u.id);
    await fetch(`/api/groups/${group.id}`, {
      method: 'PUT',
      headers: apiHeaders(currentUser?.id),
      body: JSON.stringify({ name: group.name, user_ids: updatedIds }),
    });
    fetchGroupMembers(group.id);
  };

  const handleAddMember = async (group: Group) => {
    if (!selectedNewMemberId) return;
    const currentMembers = membersByGroup[group.id] || [];
    const updatedIds = [...currentMembers.map(u => u.id), selectedNewMemberId];
    await fetch(`/api/groups/${group.id}`, {
      method: 'PUT',
      headers: apiHeaders(currentUser?.id),
      body: JSON.stringify({ name: group.name, user_ids: updatedIds }),
    });
    setAddingMemberToGroup(null);
    setSelectedNewMemberId('');
    fetchGroupMembers(group.id);
  };

  const getAvailableUsers = (groupId: string) => {
    const currentMembers = membersByGroup[groupId] || [];
    const memberIds = new Set(currentMembers.map(u => u.id));
    return orgUsers.filter(u => !memberIds.has(u.id));
  };

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-lg">Please select an organization to view groups</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {currentUser ? (
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Add a New Group</h2>
          <form onSubmit={handleSubmit} className="p-4 bg-gray-50 rounded-lg shadow-sm space-y-4">
            <input
              type="text"
              placeholder="Group Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Initial Members</label>
              <select
                multiple
                value={selectedUserIds.map(String)}
                onChange={(e) => setSelectedUserIds(Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full h-32 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                {orgUsers.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">Add Group</button>
            </div>
          </form>
        </div>
      ) : (
        <p className="text-gray-500">Please select a user to manage groups.</p>
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Current Groups</h2>
        {currentUser ? (
          groups.length > 0 ? (
            <ul className="space-y-4">
              {groups.map((group) => {
                const members = membersByGroup[group.id] || [];
                const availableUsers = getAvailableUsers(group.id);
                const PAGE_SIZE = 5;
                const page = pageByGroup[group.id] || 0;
                const totalPages = Math.ceil(members.length / PAGE_SIZE);
                const pagedMembers = members.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
                return (
                  <li key={group.id} className="p-4 bg-white rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <p className="font-semibold text-gray-700 text-lg">{group.name}</p>
                        <p className="text-sm text-gray-500">{members.length} member{members.length !== 1 ? 's' : ''}</p>
                      </div>
                      <button onClick={() => handleDelete(group.id)} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition">Delete</button>
                    </div>

                    {members.length > 0 && (
                      <>
                        <ul className="space-y-2 mb-3">
                          {pagedMembers.map(member => (
                            <li key={member.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-700">{member.name}</p>
                                <p className="text-sm text-gray-500">{member.email}</p>
                              </div>
                              <button
                                onClick={() => handleRemoveMember(group, member.id)}
                                className="px-3 py-1 text-sm bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200 transition"
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between mb-3">
                            <button
                              onClick={() => setPageByGroup(prev => ({ ...prev, [group.id]: page - 1 }))}
                              disabled={page === 0}
                              className="px-3 py-1 text-sm font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300"
                            >
                              Previous
                            </button>
                            <span className="text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
                            <button
                              onClick={() => setPageByGroup(prev => ({ ...prev, [group.id]: page + 1 }))}
                              disabled={page >= totalPages - 1}
                              className="px-3 py-1 text-sm font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {addingMemberToGroup === group.id ? (
                      <div className="flex items-center space-x-2">
                        <select
                          value={selectedNewMemberId}
                          onChange={(e) => setSelectedNewMemberId(e.target.value)}
                          className="flex-1 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        >
                          <option value="" disabled>Select a user</option>
                          {availableUsers.map(user => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAddMember(group)}
                          className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => { setAddingMemberToGroup(null); setSelectedNewMemberId(''); }}
                          className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      availableUsers.length > 0 && (
                        <button
                          onClick={() => setAddingMemberToGroup(group.id)}
                          className="px-4 py-2 text-sm bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                        >
                          + Add Member
                        </button>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-gray-500">No groups found for this organization.</p>
          )
        ) : (
          <p className="text-gray-500">Please select a user to view groups.</p>
        )}
      </div>
    </div>
  );
};

export default GroupsTab;
