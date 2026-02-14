'use client';

import { useState, useEffect } from 'react';
import FolderView from './FolderView';
import { List, Grid, Shield } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { useUser } from '@/context/UserContext';
import { usePermissions, useRoleAssignments } from '@/hooks/usePermissions';

interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  organization_id: string;
}

interface Kahoot {
  id: string;
  name: string;
}

interface FolderContent {
  id: string;
  name: string;
  parent_folder_id: string | null;
  subfolders: Folder[];
  kahoots: Kahoot[];
}

interface User {
  id: string;
  name: string;
}

const FoldersTab = () => {
  const { currentOrganization } = useOrganization();
  const { currentUser } = useUser();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderContent, setFolderContent] = useState<FolderContent | null>(null);
  const [name, setName] = useState('');
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [error, setError] = useState<string>('');
  const [showPermissions, setShowPermissions] = useState(false);

  // Permission hooks
  const { permissions, loading: permLoading } = usePermissions(
    currentUser?.id,
    'folder',
    currentFolderId
  );
  const { assignments, assignRole, removeRole } = useRoleAssignments(
    'folder',
    currentFolderId
  );

  // Users for role assignment
  const [orgUsers, setOrgUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('viewer');

  useEffect(() => {
    if (currentOrganization) {
      fetchFolderContent(currentFolderId);
      fetchAllFolders();
      fetchOrgUsers();
    } else {
      setFolderContent(null);
      setAllFolders([]);
      setOrgUsers([]);
    }
  }, [currentFolderId, currentOrganization]);

  const fetchOrgUsers = async () => {
    if (!currentOrganization) return;
    const res = await fetch(`/api/users?organizationId=${currentOrganization.id}`);
    const data = await res.json();
    setOrgUsers(data);
  };

  const fetchAllFolders = async () => {
    if (!currentOrganization) return;
    const res = await fetch(`/api/folders?organizationId=${currentOrganization.id}`);
    const data = await res.json();
    setAllFolders(data);
  };

  const fetchFolderContent = async (folderId: string | null) => {
    if (!currentOrganization) return;

    if (folderId === null) {
      // At root level, show children of the hidden root folder (not the hidden root itself)
      const orgRes = await fetch(`/api/organizations/${currentOrganization.id}`);
      const orgData = await orgRes.json();
      const hiddenRootId = orgData.root_folder_id;

      const res = await fetch(`/api/folders?organizationId=${currentOrganization.id}`);
      const data = await res.json();
      setFolderContent({
        id: '',
        name: 'Home',
        parent_folder_id: null,
        subfolders: data.filter((f: Folder) => f.parent_folder_id === hiddenRootId),
        kahoots: [],
      });
    } else {
      const res = await fetch(`/api/folders/${folderId}`);
      const data = await res.json();
      setFolderContent(data);
    }
  };

  const handleFolderClick = (folderId: string) => {
    setCurrentFolderId(folderId);
  };

  const handleBackClick = async () => {
    if (!folderContent || !currentOrganization) return;

    // Get the hidden root folder ID
    const orgRes = await fetch(`/api/organizations/${currentOrganization.id}`);
    const orgData = await orgRes.json();
    const hiddenRootId = orgData.root_folder_id;

    // If parent is the hidden root, go back to Home (null) instead
    if (folderContent.parent_folder_id === hiddenRootId) {
      setCurrentFolderId(null);
    } else {
      setCurrentFolderId(folderContent.parent_folder_id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update folder');
        return;
      }

      const updatedFolder = await res.json();

      setAllFolders(allFolders.map(f => f.id === updatedFolder.id ? { ...f, name: updatedFolder.name } : f));

      if (folderContent && folderContent.subfolders.some(f => f.id === updatedFolder.id)) {
          setFolderContent({
              ...folderContent,
              subfolders: folderContent.subfolders.map(f => f.id === updatedFolder.id ? { ...f, name: updatedFolder.name } : f)
          });
      }

    } else {
      if (!currentOrganization) return;

      // Get the organization's hidden root folder ID for creating folders at root level
      let parentFolderId = currentFolderId;
      if (currentFolderId === null) {
        const orgRes = await fetch(`/api/organizations/${currentOrganization.id}`);
        const orgData = await orgRes.json();
        parentFolderId = orgData.root_folder_id;
      }

      const folderData = {
        name,
        parent_folder_id: parentFolderId,
        organization_id: currentOrganization.id,
      };
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to create folder');
        return;
      }

      const newFolder = await res.json();

      setAllFolders([...allFolders, newFolder]);

      if (folderContent) {
        setFolderContent({
          ...folderContent,
          subfolders: [...folderContent.subfolders, newFolder]
        });
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

  const handleDelete = async (id: string) => {
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
    setError('');
  };

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-lg">Please select an organization to view folders</p>
      </div>
    );
  }

  const handleAssignRole = async () => {
    if (!selectedUserId || !selectedRole || !currentFolderId) return;
    await assignRole(`user:${selectedUserId}`, selectedRole);
    setSelectedUserId('');
  };

  const handleRemoveRole = async (user: string, relation: string) => {
    await removeRole(user, relation);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {editingFolder ? 'Edit Folder' : 'Add a New Folder'}
        </h2>
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
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
          <div>
            {currentFolderId && (
              <button
                onClick={() => setShowPermissions(!showPermissions)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  showPermissions ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Shield size={16} />
                Permissions
              </button>
            )}
          </div>
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

        {/* Permissions Panel */}
        {showPermissions && currentFolderId && (
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-4">
            <h3 className="text-lg font-bold text-purple-800">
              Folder Permissions {permLoading && <span className="text-sm font-normal text-purple-500">(loading...)</span>}
            </h3>

            {/* Current user permissions */}
            {currentUser && (
              <div>
                <h4 className="text-sm font-semibold text-purple-700 mb-2">
                  Your permissions ({currentUser.name}):
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(permissions).map(([perm, allowed]) => (
                    <span
                      key={perm}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        allowed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {perm.replace('_effective', '').replace('can_', '')}:{' '}
                      {allowed ? 'Yes' : 'No'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Role assignments */}
            <div>
              <h4 className="text-sm font-semibold text-purple-700 mb-2">Role assignments:</h4>
              {assignments.length === 0 ? (
                <p className="text-sm text-purple-500">No roles assigned yet</p>
              ) : (
                <ul className="space-y-1">
                  {assignments.map((a, i) => (
                    <li key={i} className="flex items-center justify-between text-sm bg-white p-2 rounded">
                      <span>
                        <span className="font-medium">{a.user}</span>
                        {' '}is{' '}
                        <span className="font-semibold text-purple-700">{a.relation}</span>
                      </span>
                      <button
                        onClick={() => handleRemoveRole(a.user, a.relation)}
                        className="text-red-500 hover:text-red-700 text-xs px-2 py-1"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Assign new role */}
            <div>
              <h4 className="text-sm font-semibold text-purple-700 mb-2">Assign role:</h4>
              <div className="flex items-end gap-2">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="border border-purple-300 p-2 rounded-lg text-sm flex-grow"
                >
                  <option value="">Select User</option>
                  {orgUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="border border-purple-300 p-2 rounded-lg text-sm"
                >
                  <option value="manager">Manager</option>
                  <option value="editor">Editor</option>
                  <option value="creator">Creator</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={handleAssignRole}
                  disabled={!selectedUserId}
                  className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition disabled:opacity-50 text-sm"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        )}

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
              permissions={currentFolderId ? permissions : undefined}
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