'use client';

import { useState, useEffect } from 'react';

interface Group {
  id: number;
  name: string;
  organization_id: number;
  user_ids?: number[];
}

interface User {
  id: number;
  name: string;
}

interface Organization {
  id: number;
  name: string;
}

const GroupsTab = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [name, setName] = useState('');
  const [organizationId, setOrganizationId] = useState<number | ''>('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  useEffect(() => {
    fetchGroups();
    fetchUsers();
    fetchOrganizations();
  }, []);

  const fetchGroups = async () => {
    const res = await fetch('/api/groups');
    const data = await res.json();
    setGroups(data);
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(data);
  };

  const fetchOrganizations = async () => {
    const res = await fetch('/api/organizations');
    const data = await res.json();
    setOrganizations(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const groupData = { name, organization_id: organizationId, user_ids: selectedUserIds };

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
    setOrganizationId(data.organization_id);
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
    setOrganizationId('');
    setSelectedUserIds([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{editingGroup ? 'Edit Group' : 'Add a New Group'}</h2>
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 rounded-lg shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Group Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
            />
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(Number(e.target.value))}
              className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
            >
              <option value="" disabled>Select Organization</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign Users</label>
            <select
              multiple
              value={selectedUserIds.map(String)}
              onChange={(e) => setSelectedUserIds(Array.from(e.target.selectedOptions, option => Number(option.value)))}
              className="w-full h-32 border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              {users.map(user => (
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

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Current Groups</h2>
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
      </div>
    </div>
  );
};

export default GroupsTab;