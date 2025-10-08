'use client';

import { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

interface Organization {
  id: number;
  name: string;
}

const UsersTab = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState<number | ''>('');
  const [newOrganization, setNewOrganization] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchOrganizations();
  }, []);

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
    if (editingUser) {
      await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
    } else {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, organizationId, newOrganization }),
      });
    }
    resetForm();
    fetchUsers();
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/users/${id}`, {
      method: 'DELETE',
    });
    fetchUsers();
  };

  const resetForm = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setOrganizationId('');
    setNewOrganization('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{editingUser ? 'Edit User' : 'Add a New User'}</h2>
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 rounded-lg shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
            />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
            />
          </div>
          {!editingUser && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={organizationId}
                onChange={(e) => {
                  setOrganizationId(Number(e.target.value));
                  setNewOrganization('');
                }}
                className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="" disabled>Select an Organization</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Or Create a New Organization"
                value={newOrganization}
                onChange={(e) => {
                  setNewOrganization(e.target.value);
                  setOrganizationId('');
                }}
                className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          )}
          <div className="flex justify-end space-x-3">
            {editingUser && <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition">Cancel</button>}
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">{editingUser ? 'Update User' : 'Add User'}</button>
          </div>
        </form>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Current Users</h2>
        <ul className="space-y-3">
          {users.map((user) => (
            <li key={user.id} className="flex justify-between items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition">
              <div>
                <p className="font-semibold text-gray-700">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => handleEdit(user)} className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition">Edit</button>
                <button onClick={() => handleDelete(user.id)} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default UsersTab;