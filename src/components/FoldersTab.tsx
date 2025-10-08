'use client';

import { useState, useEffect } from 'react';
import FolderView from './FolderView';
import { List, Grid } from 'lucide-react';

interface Folder {
  id: number;
  name: string;
  parent_folder_id: number | null;
}

interface Kahoot {
  id: number;
  name: string;
}

interface FolderContent {
  id: number;
  name: string;
  parent_folder_id: number | null;
  subfolders: Folder[];
  kahoots: Kahoot[];
}

const FoldersTab = () => {
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [folderContent, setFolderContent] = useState<FolderContent | null>(null);
  const [name, setName] = useState('');
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [allFolders, setAllFolders] = useState<Folder[]>([]);

  useEffect(() => {
    fetchFolderContent(currentFolderId);
    fetchAllFolders();
  }, [currentFolderId]);

  const fetchAllFolders = async () => {
    const res = await fetch('/api/folders');
    const data = await res.json();
    setAllFolders(data);
  };

  const fetchFolderContent = async (folderId: number | null) => {
    if (folderId === null) {
      const res = await fetch('/api/folders');
      const data = await res.json();
      setFolderContent({
        id: 0,
        name: 'Home',
        parent_folder_id: null,
        subfolders: data.filter((f: Folder) => f.parent_folder_id === null),
        kahoots: [],
      });
    } else {
      const res = await fetch(`/api/folders/${folderId}`);
      const data = await res.json();
      setFolderContent(data);
    }
  };

  const handleFolderClick = (folderId: number) => {
    setCurrentFolderId(folderId);
  };

  const handleBackClick = () => {
    if (folderContent) {
      setCurrentFolderId(folderContent.parent_folder_id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingFolder) {
      const folderData = {
        name,
        parent_folder_id: editingFolder.parent_folder_id, // Keep original parent
      };
      const res = await fetch(`/api/folders/${editingFolder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderData),
      });
      const updatedFolder = await res.json();

      setAllFolders(allFolders.map(f => f.id === updatedFolder.id ? { ...f, name: updatedFolder.name } : f));

      if (folderContent && folderContent.subfolders.some(f => f.id === updatedFolder.id)) {
          setFolderContent({
              ...folderContent,
              subfolders: folderContent.subfolders.map(f => f.id === updatedFolder.id ? { ...f, name: updatedFolder.name } : f)
          });
      }

    } else {
      const folderData = {
        name,
        parent_folder_id: currentFolderId,
      };
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderData),
      });
      const newFolder = await res.json();

      setAllFolders([...allFolders, newFolder]);

      if (folderContent && newFolder.parent_folder_id === currentFolderId) {
          setFolderContent({
              ...folderContent,
              subfolders: [...folderContent.subfolders, newFolder]
          });
      } else if (currentFolderId === null && newFolder.parent_folder_id === null) {
        // This handles adding a folder to the root when viewing the root
        setFolderContent(prev => prev ? { ...prev, subfolders: [...prev.subfolders, newFolder]} : null);
      }
    }
    resetForm();
  };

  const handleEdit = (folder: Folder) => {
    setEditingFolder(folder);
    setName(folder.name);
  };

  const [kahootName, setKahootName] = useState('');

  const handleKahootSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFolderId) return;

    const kahootData = {
      name: kahootName,
      folder_id: currentFolderId,
    };

    const res = await fetch('/api/kahoots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kahootData),
    });

    if (res.ok) {
      const newKahoot = await res.json();
      if (folderContent) {
        setFolderContent({
          ...folderContent,
          kahoots: [...folderContent.kahoots, newKahoot],
        });
      }
      setKahootName('');
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/folders/${id}`, {
      method: 'DELETE',
    });

    setAllFolders(prev => prev.filter(f => f.id !== id));

    if (folderContent) {
      setFolderContent({
        ...folderContent,
        subfolders: folderContent.subfolders.filter(f => f.id !== id)
      });
    }
  };

  const resetForm = () => {
    setEditingFolder(null);
    setName('');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {editingFolder ? 'Edit Folder' : 'Add a New Folder'}
        </h2>
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 rounded-lg shadow-sm space-y-4">
          <div className="flex items-end gap-4">
            <input
              type="text"
              placeholder="Folder Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-grow border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              required
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              {editingFolder ? 'Update' : 'Add'}
            </button>
            {editingFolder && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <div />
          <div className="flex space-x-2">
            <button
              onClick={() => setViewType('list')}
              className={`p-2 rounded-lg ${viewType === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setViewType('grid')}
              className={`p-2 rounded-lg ${viewType === 'grid' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              <Grid size={20} />
            </button>
          </div>
        </div>

        {folderContent && (
          <>
            <FolderView
              folders={folderContent.subfolders}
              kahoots={folderContent.kahoots}
              currentFolder={
                currentFolderId
                  ? {
                      id: folderContent.id,
                      name: folderContent.name,
                      parent_folder_id: folderContent.parent_folder_id,
                    }
                  : null
              }
              onFolderClick={handleFolderClick}
              onBackClick={handleBackClick}
              viewType={viewType}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />

            {currentFolderId && (
              <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Add a New Kahoot to This Folder</h3>
                <form onSubmit={handleKahootSubmit} className="p-4 bg-gray-50 rounded-lg shadow-sm">
                  <div className="flex items-end gap-4">
                    <input
                      type="text"
                      placeholder="Kahoot Name"
                      value={kahootName}
                      onChange={(e) => setKahootName(e.target.value)}
                      className="flex-grow border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="submit"
                      className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
                    >
                      Add Kahoot
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default FoldersTab;