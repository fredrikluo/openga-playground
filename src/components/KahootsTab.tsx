'use client';

import { useState, useEffect } from 'react';

interface Kahoot {
  id: number;
  name: string;
  folder_id: number;
}

interface Folder {
  id: number;
  name: string;
}

const KahootsTab = () => {
  const [kahoots, setKahoots] = useState<Kahoot[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [name, setName] = useState('');
  const [folderId, setFolderId] = useState<number | ''>('');
  const [editingKahoot, setEditingKahoot] = useState<Kahoot | null>(null);

  useEffect(() => {
    fetchKahoots();
    fetchFolders();
  }, []);

  const fetchKahoots = async () => {
    const res = await fetch('/api/kahoots');
    const data = await res.json();
    setKahoots(data);
  };

  const fetchFolders = async () => {
    const res = await fetch('/api/folders');
    const data = await res.json();
    setFolders(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const kahootData = { name, folder_id: folderId };

    if (editingKahoot) {
      await fetch(`/api/kahoots/${editingKahoot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kahootData),
      });
    } else {
      await fetch('/api/kahoots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kahootData),
      });
    }
    resetForm();
    fetchKahoots();
  };

  const handleEdit = (kahoot: Kahoot) => {
    setEditingKahoot(kahoot);
    setName(kahoot.name);
    setFolderId(kahoot.folder_id);
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/kahoots/${id}`, {
      method: 'DELETE',
    });
    fetchKahoots();
  };

  const resetForm = () => {
    setEditingKahoot(null);
    setName('');
    setFolderId('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{editingKahoot ? 'Edit Kahoot' : 'Add a New Kahoot'}</h2>
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 rounded-lg shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Kahoot Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
            />
            <select
              value={folderId}
              onChange={(e) => setFolderId(Number(e.target.value))}
              className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
            >
              <option value="" disabled>Select Folder</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3">
            {editingKahoot && <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition">Cancel</button>}
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">{editingKahoot ? 'Update Kahoot' : 'Add Kahoot'}</button>
          </div>
        </form>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Current Kahoots</h2>
        <ul className="space-y-3">
          {kahoots.map((kahoot) => (
            <li key={kahoot.id} className="flex justify-between items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition">
              <p className="font-semibold text-gray-700">{kahoot.name}</p>
              <div className="flex space-x-2">
                <button onClick={() => handleEdit(kahoot)} className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition">Edit</button>
                <button onClick={() => handleDelete(kahoot.id)} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default KahootsTab;