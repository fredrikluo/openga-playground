'use client';

import { useState, useEffect } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { useUser } from '@/context/UserContext';
import { usePermissions } from '@/hooks/usePermissions';

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
  const { currentOrganization } = useOrganization();
  const { currentUser } = useUser();
  const [kahoots, setKahoots] = useState<Kahoot[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [name, setName] = useState('');
  const [folderId, setFolderId] = useState<number | ''>('');
  const [editingKahoot, setEditingKahoot] = useState<Kahoot | null>(null);
  const [selectedKahootId, setSelectedKahootId] = useState<number | null>(null);

  // Check permissions for the selected kahoot (document)
  const { permissions } = usePermissions(currentUser?.id, 'document', selectedKahootId);

  useEffect(() => {
    if (currentOrganization) {
      fetchKahoots();
      fetchFolders();
    } else {
      setKahoots([]);
      setFolders([]);
    }
  }, [currentOrganization]);

  const fetchKahoots = async () => {
    if (!currentOrganization) return;
    const res = await fetch(`/api/kahoots?organizationId=${currentOrganization.id}`);
    const data = await res.json();
    setKahoots(data);
  };

  const fetchFolders = async () => {
    if (!currentOrganization) return;

    // Get organization's hidden root folder ID
    const orgRes = await fetch(`/api/organizations/${currentOrganization.id}`);
    const orgData = await orgRes.json();
    const hiddenRootId = orgData.root_folder_id;

    // Fetch all folders and filter out the hidden root
    const res = await fetch(`/api/folders?organizationId=${currentOrganization.id}`);
    const data = await res.json();

    // Filter out the hidden root folder
    const visibleFolders = data.filter((folder: Folder) => folder.id !== hiddenRootId);
    setFolders(visibleFolders);
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

  const getFolderName = (folderId: number) => {
    const folder = folders.find((f) => f.id === folderId);
    return folder ? folder.name : '...';
  };

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-lg">Please select an organization to view kahoots</p>
      </div>
    );
  }

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
            <li
              key={kahoot.id}
              className={`flex justify-between items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition cursor-pointer ${
                selectedKahootId === kahoot.id ? 'ring-2 ring-purple-400' : ''
              }`}
              onClick={() => setSelectedKahootId(selectedKahootId === kahoot.id ? null : kahoot.id)}
            >
              <div>
                <p className="font-semibold text-gray-700">{kahoot.name}</p>
                <p className="text-sm text-gray-500">Folder: {getFolderName(kahoot.folder_id)}</p>
                {selectedKahootId === kahoot.id && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(permissions).map(([perm, allowed]) => (
                      <span
                        key={perm}
                        className={`px-1.5 py-0.5 rounded text-xs ${
                          allowed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {perm.replace('_effective', '').replace('can_', '')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                <button onClick={(e) => { e.stopPropagation(); handleEdit(kahoot); }} className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition">Edit</button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(kahoot.id); }} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default KahootsTab;