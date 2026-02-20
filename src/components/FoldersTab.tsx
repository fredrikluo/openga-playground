'use client';

import { useState, useEffect } from 'react';
import FolderView from './FolderView';
import FolderPickerModal from './FolderPickerModal';
import { List, Grid, X, Folder as FolderIcon, FileText, Eye, EyeOff } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { useUser } from '@/context/UserContext';
import { apiHeaders, getHeaders } from '@/lib/api';
import { usePermissions, useRoleAssignments } from '@/hooks/usePermissions';

interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  organization_id: string;
  creator_id: string | null;
}

interface Kahoot {
  id: string;
  name: string;
  creator_id?: string | null;
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

interface Group {
  id: string;
  name: string;
}

type SelectedItem = { type: 'folder'; id: string; name: string; creator_id?: string | null } | { type: 'document'; id: string; name: string; creator_id?: string | null } | null;

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

  // Side panel selection
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);

  // Permission check for the current folder (for create permission)
  const { permissions: currentFolderPerms, loading: createPermLoading } = usePermissions(
    currentUser?.id,
    'folder',
    currentFolderId
  );
  const canCreateInCurrentFolder = !currentFolderId || createPermLoading || currentFolderPerms.can_create_effective;

  // Permission hooks for the selected item
  const { permissions, loading: permLoading } = usePermissions(
    currentUser?.id,
    selectedItem?.type || 'folder',
    selectedItem?.id || null
  );
  const { assignments, assignRole, removeRole } = useRoleAssignments(
    selectedItem?.type || 'folder',
    selectedItem?.id || null
  );

  // Full visibility: on = show all (dim non-viewable), off = hide non-viewable (default)
  const [fullVisibility, setFullVisibility] = useState(false);
  const [viewableItems, setViewableItems] = useState<Record<string, boolean>>({});

  // Move modal state
  const [movingItem, setMovingItem] = useState<{ type: 'folder' | 'kahoot'; id: string; name: string; parentId: string | null } | null>(null);
  const [rootFolderId, setRootFolderId] = useState<string>('');

  // Shared with me
  const [sharedWithMe, setSharedWithMe] = useState<{ folders: { id: string; name: string; relation: string; owner: string | null; orgName?: string }[]; kahoots: { id: string; name: string; relation: string; owner: string | null; orgName?: string }[] } | null>(null);
  const [showAllShared, setShowAllShared] = useState(false);

  // Users and groups for role assignment
  const [orgUsers, setOrgUsers] = useState<User[]>([]);
  const [orgGroups, setOrgGroups] = useState<Group[]>([]);
  const [assigneeType, setAssigneeType] = useState<'user' | 'group'>('user');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('viewer');

  useEffect(() => {
    if (currentOrganization) {
      fetchFolderContent(currentFolderId);
      fetchAllFolders();
      fetchOrgUsers();
      fetchOrgGroups();
      fetchSharedWithMe();
    } else {
      setFolderContent(null);
      setAllFolders([]);
      setOrgUsers([]);
      setOrgGroups([]);
      setSharedWithMe(null);
    }
  }, [currentFolderId, currentOrganization, currentUser]);

  // Close side panel when navigating folders
  useEffect(() => {
    setSelectedItem(null);
  }, [currentFolderId]);

  // Batch check can_view_effective for all items when content changes
  useEffect(() => {
    if (!currentUser || !folderContent) {
      setViewableItems({});
      return;
    }

    const checkVisibility = async () => {
      const checks = [
        ...folderContent.subfolders.map(f => ({
          user: `user:${currentUser.id}`,
          relation: 'can_view_effective',
          object: `folder:${f.id}`,
        })),
        ...folderContent.kahoots.map(k => ({
          user: `user:${currentUser.id}`,
          relation: 'can_view_effective',
          object: `document:${k.id}`,
        })),
      ];

      if (checks.length === 0) return;

      try {
        const res = await fetch('/api/permissions/check', {
          method: 'POST',
          headers: apiHeaders(currentUser.id),
          body: JSON.stringify({ checks }),
        });
        if (res.ok) {
          const data = await res.json();
          const map: Record<string, boolean> = {};
          for (const r of data.results) {
            const id = r.object.split(':')[1];
            map[id] = r.allowed;
          }
          setViewableItems(map);
        }
      } catch (err) {
        console.error('Visibility check error:', err);
      }
    };

    checkVisibility();
  }, [folderContent, currentUser]);

  const fetchOrgUsers = async () => {
    if (!currentOrganization) return;
    const res = await fetch(`/api/users?organizationId=${currentOrganization.id}`, { headers: getHeaders(currentUser?.id) });
    const data = await res.json();
    setOrgUsers(data);
  };

  const fetchOrgGroups = async () => {
    if (!currentOrganization) return;
    const res = await fetch(`/api/groups?organizationId=${currentOrganization.id}`, { headers: getHeaders(currentUser?.id) });
    const data = await res.json();
    setOrgGroups(data);
  };

  const fetchAllFolders = async () => {
    if (!currentOrganization) return;
    const res = await fetch(`/api/folders?organizationId=${currentOrganization.id}`, { headers: getHeaders(currentUser?.id) });
    const data = await res.json();
    setAllFolders(data);
  };

  const fetchSharedWithMe = async (allOrgs?: boolean) => {
    if (!currentUser) {
      setSharedWithMe(null);
      return;
    }
    try {
      const orgParam = !allOrgs && currentOrganization ? `?organizationId=${currentOrganization.id}` : '';
      const res = await fetch(`/api/users/${currentUser.id}/shared${orgParam}`, { headers: getHeaders(currentUser.id) });
      if (res.ok) {
        setSharedWithMe(await res.json());
      }
    } catch (error) {
      console.error('Error fetching shared items:', error);
    }
  };

  const fetchFolderContent = async (folderId: string | null) => {
    if (!currentOrganization) return;

    if (folderId === null) {
      const orgRes = await fetch(`/api/organizations/${currentOrganization.id}`, { headers: getHeaders(currentUser?.id) });
      const orgData = await orgRes.json();
      const hiddenRootId = orgData.root_folder_id;
      setRootFolderId(hiddenRootId);

      const res = await fetch(`/api/folders?organizationId=${currentOrganization.id}`, { headers: getHeaders(currentUser?.id) });
      const data = await res.json();
      setFolderContent({
        id: '',
        name: 'Home',
        parent_folder_id: null,
        subfolders: data.filter((f: Folder) => f.parent_folder_id === hiddenRootId),
        kahoots: [],
      });
    } else {
      const res = await fetch(`/api/folders/${folderId}`, { headers: getHeaders(currentUser?.id) });
      const data = await res.json();
      setFolderContent(data);
    }
  };

  const handleFolderClick = (folderId: string) => {
    setCurrentFolderId(folderId);
  };

  const handleFolderSelect = (folder: Folder) => {
    setSelectedItem({ type: 'folder', id: folder.id, name: folder.name, creator_id: folder.creator_id });
  };

  const handleKahootSelect = (kahoot: Kahoot) => {
    setSelectedItem(prev =>
      prev?.type === 'document' && prev.id === kahoot.id
        ? null
        : { type: 'document', id: kahoot.id, name: kahoot.name, creator_id: kahoot.creator_id }
    );
  };

  const handleBackClick = async () => {
    if (!folderContent || !currentOrganization) return;

    const orgRes = await fetch(`/api/organizations/${currentOrganization.id}`, { headers: getHeaders(currentUser?.id) });
    const orgData = await orgRes.json();
    const hiddenRootId = orgData.root_folder_id;

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
        parent_folder_id: editingFolder.parent_folder_id,
      };
      const res = await fetch(`/api/folders/${editingFolder.id}`, {
        method: 'PUT',
        headers: apiHeaders(currentUser?.id),
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

      let parentFolderId = currentFolderId;
      if (currentFolderId === null) {
        const orgRes = await fetch(`/api/organizations/${currentOrganization.id}`, { headers: getHeaders(currentUser?.id) });
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
        headers: apiHeaders(currentUser?.id),
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

  const handleEdit = async (folder: Folder) => {
    setError('');
    if (currentUser) {
      try {
        const res = await fetch(
          `/api/permissions/check?user=user:${currentUser.id}&relation=can_edit_effective&object=folder:${folder.id}`,
          { headers: getHeaders(currentUser.id) }
        );
        if (res.ok) {
          const data = await res.json();
          if (!data.allowed) {
            setError('Permission denied: you cannot edit this folder.');
            return;
          }
        }
      } catch {
        // If check fails, let the backend enforce
      }
    }
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
      headers: apiHeaders(currentUser?.id),
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
    } else {
      const errorData = await res.json();
      setError(errorData.message || 'Failed to create kahoot');
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    if (currentUser) {
      try {
        const res = await fetch(
          `/api/permissions/check?user=user:${currentUser.id}&relation=can_remove_effective&object=folder:${id}`,
          { headers: getHeaders(currentUser.id) }
        );
        if (res.ok) {
          const data = await res.json();
          if (!data.allowed) {
            setError('Permission denied: you cannot delete this folder.');
            return;
          }
        }
      } catch { /* let backend enforce */ }
    }
    const res = await fetch(`/api/folders/${id}`, {
      method: 'DELETE',
      headers: getHeaders(currentUser?.id),
    });

    if (res.ok) {
      setAllFolders(prev => prev.filter(f => f.id !== id));
      if (folderContent) {
        setFolderContent({
          ...folderContent,
          subfolders: folderContent.subfolders.filter(f => f.id !== id)
        });
      }
      if (selectedItem?.id === id) setSelectedItem(null);
    } else {
      const errorData = await res.json();
      setError(errorData.message || 'Failed to delete folder');
    }
  };

  const handleKahootDelete = async (id: string) => {
    setError('');
    if (currentUser) {
      try {
        const res = await fetch(
          `/api/permissions/check?user=user:${currentUser.id}&relation=can_remove_effective&object=document:${id}`,
          { headers: getHeaders(currentUser.id) }
        );
        if (res.ok) {
          const data = await res.json();
          if (!data.allowed) {
            setError('Permission denied: you cannot delete this kahoot.');
            return;
          }
        }
      } catch { /* let backend enforce */ }
    }
    const res = await fetch(`/api/kahoots/${id}`, {
      method: 'DELETE',
      headers: getHeaders(currentUser?.id),
    });

    if (res.ok) {
      if (folderContent) {
        setFolderContent({
          ...folderContent,
          kahoots: folderContent.kahoots.filter(k => k.id !== id)
        });
      }
      if (selectedItem?.id === id) setSelectedItem(null);
    } else {
      const errorData = await res.json();
      setError(errorData.message || 'Failed to delete kahoot');
    }
  };

  const resetForm = () => {
    setEditingFolder(null);
    setName('');
    setError('');
  };

  const handleAssignRole = async () => {
    if (!selectedRole || !selectedItem) return;
    if (assigneeType === 'user') {
      if (!selectedUserId) return;
      await assignRole(`user:${selectedUserId}`, selectedRole);
      setSelectedUserId('');
    } else {
      if (!selectedGroupId) return;
      await assignRole(`group:${selectedGroupId}#member`, selectedRole);
      setSelectedGroupId('');
    }
  };

  // Resolve FGA user string (e.g. "user:uuid" or "group:uuid#member") to a display name
  const resolveAssigneeName = (fgaUser: string): string => {
    if (fgaUser.startsWith('user:')) {
      const id = fgaUser.replace('user:', '');
      const user = orgUsers.find(u => u.id === id);
      return user ? `user: ${user.name}` : fgaUser;
    }
    if (fgaUser.startsWith('group:')) {
      const id = fgaUser.replace('group:', '').replace('#member', '');
      const group = orgGroups.find(g => g.id === id);
      return group ? `group: ${group.name}` : fgaUser;
    }
    if (fgaUser.startsWith('organization:')) {
      return 'org: All members';
    }
    return fgaUser;
  };

  const handleFolderMove = async (folder: Folder) => {
    setError('');
    if (currentUser) {
      try {
        const res = await fetch(
          `/api/permissions/check?user=user:${currentUser.id}&relation=can_remove_effective&object=folder:${folder.id}`,
          { headers: getHeaders(currentUser.id) }
        );
        if (res.ok) {
          const data = await res.json();
          if (!data.allowed) {
            setError('Permission denied: you cannot move this folder.');
            return;
          }
        }
      } catch { /* let backend enforce */ }
    }
    setMovingItem({ type: 'folder', id: folder.id, name: folder.name, parentId: folder.parent_folder_id });
  };

  const handleKahootMove = async (kahoot: Kahoot) => {
    setError('');
    if (currentUser) {
      try {
        const res = await fetch(
          `/api/permissions/check?user=user:${currentUser.id}&relation=can_remove_effective&object=document:${kahoot.id}`,
          { headers: getHeaders(currentUser.id) }
        );
        if (res.ok) {
          const data = await res.json();
          if (!data.allowed) {
            setError('Permission denied: you cannot move this kahoot.');
            return;
          }
        }
      } catch { /* let backend enforce */ }
    }
    setMovingItem({ type: 'kahoot', id: kahoot.id, name: kahoot.name, parentId: currentFolderId });
  };

  const handleKahootDuplicate = async (kahoot: Kahoot) => {
    setError('');
    if (currentUser) {
      try {
        const res = await fetch(
          `/api/permissions/check?user=user:${currentUser.id}&relation=can_duplicate_effective&object=document:${kahoot.id}`,
          { headers: getHeaders(currentUser.id) }
        );
        if (res.ok) {
          const data = await res.json();
          if (!data.allowed) {
            setError('Permission denied: you cannot duplicate this kahoot.');
            return;
          }
        }
      } catch { /* let backend enforce */ }
    }
    const res = await fetch(`/api/kahoots/${kahoot.id}/duplicate`, {
      method: 'POST',
      headers: getHeaders(currentUser?.id),
    });
    if (res.ok) {
      const newKahoot = await res.json();
      if (folderContent) {
        setFolderContent({
          ...folderContent,
          kahoots: [...folderContent.kahoots, newKahoot],
        });
      }
    } else {
      const data = await res.json();
      setError(data.message || 'Failed to duplicate kahoot.');
    }
  };

  const handleMoveConfirm = async (destFolderId: string) => {
    if (!movingItem) return;
    setError('');

    if (movingItem.type === 'folder') {
      const folder = allFolders.find(f => f.id === movingItem.id);
      if (!folder) return;
      const res = await fetch(`/api/folders/${movingItem.id}`, {
        method: 'PUT',
        headers: apiHeaders(currentUser?.id),
        body: JSON.stringify({ name: folder.name, parent_folder_id: destFolderId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Failed to move folder');
      }
    } else {
      const res = await fetch(`/api/kahoots/${movingItem.id}`, {
        method: 'PUT',
        headers: apiHeaders(currentUser?.id),
        body: JSON.stringify({ name: movingItem.name, folder_id: destFolderId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Failed to move kahoot');
      }
    }

    setMovingItem(null);
    fetchFolderContent(currentFolderId);
    fetchAllFolders();
  };

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-lg">Please select an organization to view folders</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {editingFolder ? 'Edit Folder' : 'Add a New Folder'}
        </h2>
        {error && (
          <div className="flex items-center justify-between p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg mb-4">
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-2 text-red-500 hover:text-red-700 font-bold text-lg leading-none">&times;</button>
          </div>
        )}
        {!canCreateInCurrentFolder && !editingFolder && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg mb-4 text-sm">
            You do not have permission to create folders here.
          </div>
        )}
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 rounded-lg shadow-sm space-y-4">
          <div className="flex items-end gap-4">
            <input
              type="text"
              placeholder="Folder Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-grow border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50"
              required
              disabled={!canCreateInCurrentFolder && !editingFolder}
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!canCreateInCurrentFolder && !editingFolder}
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

      <div className="flex gap-6">
        {/* Main content */}
        <div className={`${selectedItem ? 'w-2/3' : 'w-full'} transition-all`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFullVisibility(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  fullVisibility
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {fullVisibility ? <Eye size={16} /> : <EyeOff size={16} />}
                {fullVisibility ? 'Full visibility: On' : 'Full visibility: Off'}
              </button>
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
                onFolderSelect={handleFolderSelect}
                onKahootSelect={handleKahootSelect}
                onKahootDelete={handleKahootDelete}
                onFolderMove={handleFolderMove}
                onKahootMove={handleKahootMove}
                onKahootDuplicate={handleKahootDuplicate}
                selectedItemId={selectedItem?.id}
                visibilityMode={fullVisibility ? 'show-all' : 'hide'}
                viewableItems={viewableItems}
              />

              {currentFolderId && (
                <div className="mt-8">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Add a New Kahoot to This Folder</h3>
                  {!canCreateInCurrentFolder && (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg mb-4 text-sm">
                      You do not have permission to create kahoots here.
                    </div>
                  )}
                  <form onSubmit={handleKahootSubmit} className="p-4 bg-gray-50 rounded-lg shadow-sm">
                    <div className="flex items-end gap-4">
                      <input
                        type="text"
                        placeholder="Kahoot Name"
                        value={kahootName}
                        onChange={(e) => setKahootName(e.target.value)}
                        className="flex-grow border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        required
                        disabled={!canCreateInCurrentFolder}
                      />
                      <button
                        type="submit"
                        className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!canCreateInCurrentFolder}
                      >
                        Add Kahoot
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}

          {/* Shared with me */}
          {currentUser && sharedWithMe && (sharedWithMe.folders.length > 0 || sharedWithMe.kahoots.length > 0 || showAllShared) && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Shared with me</h3>
                <button
                  onClick={() => {
                    const next = !showAllShared;
                    setShowAllShared(next);
                    fetchSharedWithMe(next);
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition ${
                    showAllShared
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {showAllShared ? 'All orgs' : 'This org'}
                </button>
              </div>
              <ul className="space-y-2">
                {sharedWithMe.folders.map(folder => (
                  <li key={`shared-folder-${folder.id}`} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderIcon size={18} className="text-blue-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700 truncate">{folder.name}</span>
                      {folder.owner && <span className="text-xs text-gray-400 flex-shrink-0">by {folder.owner}</span>}
                      {folder.orgName && <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded flex-shrink-0">{folder.orgName}</span>}
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full flex-shrink-0">{folder.relation}</span>
                  </li>
                ))}
                {sharedWithMe.kahoots.map(kahoot => (
                  <li key={`shared-kahoot-${kahoot.id}`} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={18} className="text-green-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700 truncate">{kahoot.name}</span>
                      {kahoot.owner && <span className="text-xs text-gray-400 flex-shrink-0">by {kahoot.owner}</span>}
                      {kahoot.orgName && <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded flex-shrink-0">{kahoot.orgName}</span>}
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex-shrink-0">{kahoot.relation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Side panel */}
        {selectedItem && (
          <div className="w-1/3 border-l border-gray-200 pl-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedItem.type === 'folder' ? (
                  <FolderIcon size={20} className="text-blue-500" />
                ) : (
                  <FileText size={20} className="text-green-500" />
                )}
                <h3 className="text-lg font-bold text-gray-800 truncate">{selectedItem.name}</h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-full hover:bg-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-400 font-mono truncate">{selectedItem.type}:{selectedItem.id}</p>

            {/* Owner */}
            <p className="text-sm text-gray-600">
              Owner: {selectedItem.creator_id
                ? orgUsers.find(u => u.id === selectedItem.creator_id)?.name || selectedItem.creator_id
                : <span className="text-gray-400 italic">System</span>}
            </p>

            {/* Permissions */}
            <div>
              <h4 className="text-sm font-semibold text-purple-700 mb-2">
                Your permissions {permLoading && <span className="text-purple-400">(loading...)</span>}
              </h4>
              <div className="flex flex-wrap gap-1">
                {Object.entries(permissions).map(([perm, allowed]) => (
                  <span
                    key={perm}
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      allowed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {perm.replace('_effective', '').replace('can_', '')}
                  </span>
                ))}
              </div>
            </div>

            {/* Shared with */}
            <div>
              <h4 className="text-sm font-semibold text-purple-700 mb-2">Shared with</h4>
              {assignments.length === 0 ? (
                <p className="text-sm text-gray-400">No sharing configured</p>
              ) : (
                <ul className="space-y-1">
                  {assignments.map((a, i) => (
                    <li key={i} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                      <span>
                        <span className="text-xs font-medium">{resolveAssigneeName(a.user)}</span>
                        <span className="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">{a.relation}</span>
                      </span>
                      {permissions.can_set_visibility_effective && (
                      <button
                        onClick={() => removeRole(a.user, a.relation)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Share to */}
            {permissions.can_set_visibility_effective ? (
            <div>
              <h4 className="text-sm font-semibold text-purple-700 mb-2">Share to</h4>
              <div className="space-y-2">
                <div className="flex gap-1">
                  <button
                    onClick={() => { setAssigneeType('user'); setSelectedGroupId(''); }}
                    className={`flex-1 py-1 text-xs font-medium rounded-lg transition ${
                      assigneeType === 'user' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    User
                  </button>
                  <button
                    onClick={() => { setAssigneeType('group'); setSelectedUserId(''); }}
                    className={`flex-1 py-1 text-xs font-medium rounded-lg transition ${
                      assigneeType === 'group' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Group
                  </button>
                </div>
                {assigneeType === 'user' ? (
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded-lg text-sm"
                  >
                    <option value="">Select User</option>
                    {orgUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded-lg text-sm"
                  >
                    <option value="">Select Group</option>
                    {orgGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                )}
                <div className="flex gap-2">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="flex-grow border border-gray-300 p-2 rounded-lg text-sm"
                  >
                    <option value="manager">Manager</option>
                    <option value="editor">Editor</option>
                    <option value="creator">Creator</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    onClick={handleAssignRole}
                    disabled={assigneeType === 'user' ? !selectedUserId : !selectedGroupId}
                    className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition disabled:opacity-50 text-sm"
                  >
                    Assign
                  </button>
                </div>
              </div>
            </div>
            ) : (
            <p className="text-xs text-gray-400">You do not have permission to change sharing.</p>
            )}
          </div>
        )}
      </div>

      {/* Move modal */}
      {movingItem && rootFolderId && (
        <FolderPickerModal
          folders={allFolders}
          rootFolderId={rootFolderId}
          excludeFolderId={movingItem.type === 'folder' ? movingItem.id : undefined}
          currentParentId={movingItem.parentId}
          onSelect={handleMoveConfirm}
          onClose={() => setMovingItem(null)}
          title={`Move "${movingItem.name}"`}
        />
      )}
    </div>
  );
};

export default FoldersTab;
