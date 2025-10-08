'use client';

import { useState, useEffect } from 'react';

interface Folder {
  id: number;
  name: string;
  parent_folder_id: number | null;
}

const FoldersTab = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [name, setName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<number | ''>('');
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    const res = await fetch('/api/folders');
    const data = await res.json();
    setFolders(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const folderData = { name, parent_folder_id: parentFolderId || null };

    if (editingFolder) {
      await fetch(`/api/folders/${editingFolder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderData),
      });
    } else {
      await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderData),
      });
    }
    resetForm();
    fetchFolders();
  };

  const handleEdit = (folder: Folder) => {
    setEditingFolder(folder);
    setName(folder.name);
    setParentFolderId(folder.parent_folder_id || '');
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/folders/${id}`, {
      method: 'DELETE',
    });
    fetchFolders();
  };

  const resetForm = () => {
    setEditingFolder(null);
    setName('');
    setParentFolderId('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{editingFolder ? 'Edit Folder' : 'Add a New Folder'}</h2>
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 rounded-lg shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Folder Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
            />
            <select
              value={parentFolderId}
              onChange={(e) => setParentFolderId(Number(e.target.value))}
              className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              <option value="">(No Parent)</option>
              {folders.filter(f => f.id !== editingFolder?.id).map(folder => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3">
            {editingFolder && <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition">Cancel</button>}
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">{editingFolder ? 'Update Folder' : 'Add Folder'}</button>
          </div>
        </form>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Current Folders</h2>
        <ul className="space-y-3">
          {folders.map((folder) => (
            <li key={folder.id} className="flex justify-between items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition">
              <p className="font-semibold text-gray-700">{folder.name}</p>
              <div className="flex space-x-2">
                <button onClick={() => handleEdit(folder)} className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition">Edit</button>
                <button onClick={() => handleDelete(folder.id)} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FoldersTab;