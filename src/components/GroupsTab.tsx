'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';

interface Group {
  id: number;
  name: string;
  organization_id: number;
  user_ids?: number[];
}

interface User {
  id: number;
  name: string;
  organization_id: number;
}

const GroupsTab = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const { currentUser, users } = useUser();

  const fetchGroups = async () => {
    if (currentUser) {
      const res = await fetch(`/api/groups?organizationId=${currentUser.organization_id}`);
      const data = await res.json();
      setGroups(data);
    } else {
      setGroups([]);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const groupData = {
      name,
      organization_id: currentUser.organization_id,
      user_ids: selectedUserIds,
    };

    if (editingGroup) {
      await fetch(`/api/groups/${editingGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData),
      });
    } else {
      await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData),
      });
    }
    resetForm();
    fetchGroups();
  };

  const handleEdit = async (group: Group) => {
    const res = await fetch(`/api/groups/${group.id}`);
    const data = await res.json();
    setEditingGroup(data);
    setName(data.name);
    setSelectedUserIds(data.users.map((u: User) => u.id));
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/groups/${id}`, {
      method: 'DELETE',
    });
    fetchGroups();
  };

  const resetForm = () => {
    setEditingGroup(null);
    setName('');
    setSelectedUserIds([]);
  };

  const usersInSameOrg = users.filter(u => u.organization_id === currentUser?.organization_id);

  return (
    <div className="space-y-6">
      {currentUser ? (
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{editingGroup ? 'Edit Group' : 'Add a New Group'}</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign Users</label>
              <select
                multiple
                value={selectedUserIds.map(String)}
                onChange={(e) => setSelectedUserIds(Array.from(e.target.selectedOptions, option => Number(option.value)))}
                className="w-full h-32 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                {usersInSameOrg.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              {editingGroup && <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition">Cancel</button>}
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">{editingGroup ? 'Update Group' : 'Add Group'}</button>
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
            <ul className="space-y-3">
              {groups.map((group) => (
                <li key={group.id} className="flex justify-between items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition">
                  <p className="font-semibold text-gray-700">{group.name}</p>
                  <div className="flex space-x-2">
                    <button onClick={() => handleEdit(group)} className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition">Edit</button>
                    <button onClick={() => handleDelete(group.id)} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition">Delete</button>
                  </div>
                </li>
              ))}
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