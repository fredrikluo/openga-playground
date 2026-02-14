'use client';

import { Folder, FileText, ArrowLeft, Pencil, Trash2 } from 'lucide-react';

interface Kahoot {
  id: number;
  name: string;
}

interface SubFolder {
  id: number;
  name: string;
  parent_folder_id: number | null;
  organization_id?: number;
}

interface FolderPermissions {
  can_edit_effective?: boolean;
  can_remove_effective?: boolean;
  can_create_effective?: boolean;
  [key: string]: boolean | undefined;
}

interface FolderViewProps {
  folders: SubFolder[];
  kahoots: Kahoot[];
  currentFolder: { id: number; name: string; parent_folder_id: number | null } | null;
  onFolderClick: (folderId: number) => void;
  onBackClick: () => void;
  viewType: 'grid' | 'list';
  onEdit: (folder: SubFolder) => void;
  onDelete: (folderId: number) => void;
  permissions?: FolderPermissions;
}

export default function FolderView({
  folders,
  kahoots,
  currentFolder,
  onFolderClick,
  onBackClick,
  viewType,
  onEdit,
  onDelete,
  permissions,
}: FolderViewProps) {
  const canEdit = permissions?.can_edit_effective !== false;
  const canRemove = permissions?.can_remove_effective !== false;
  return (
    <div className="min-h-[300px] overflow-y-auto">
      <div className="flex items-center mb-4">
        {currentFolder && (
          <button
            onClick={onBackClick}
            className="p-2 mr-4 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </button>
        )}
        <h2 className="text-3xl font-bold text-gray-800">{currentFolder ? currentFolder.name : 'Home'}</h2>
      </div>

      {viewType === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {folders.map((folder) => (
            <div
              key={`folder-${folder.id}`}
              className="relative flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer bg-white shadow-md hover:shadow-lg hover:bg-gray-50 transition-all"
              onClick={() => onFolderClick(folder.id)}
            >
              <Folder size={52} className="text-blue-500" />
              <span className="mt-3 text-md font-medium text-center text-gray-700">{folder.name}</span>
              {(canEdit || canRemove) && (
              <div className="absolute top-1 right-1 flex">
                {canEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(folder); }}
                  className="p-1 rounded-full hover:bg-gray-200"
                  aria-label={`Edit folder ${folder.name}`}
                >
                  <Pencil size={16} className="text-gray-600" />
                </button>
                )}
                {canRemove && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }}
                  className="p-1 rounded-full hover:bg-gray-200"
                  aria-label={`Delete folder ${folder.name}`}
                >
                  <Trash2 size={16} className="text-gray-600" />
                </button>
                )}
              </div>
              )}
            </div>
          ))}
          {kahoots.map((kahoot) => (
            <div
              key={`kahoot-${kahoot.id}`}
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-white shadow-md"
            >
              <FileText size={52} className="text-green-500" />
              <span className="mt-3 text-md font-medium text-center text-gray-700">{kahoot.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-3">
          {folders.map((folder) => (
            <li
              key={`folder-${folder.id}`}
              className="flex items-center p-4 rounded-lg cursor-pointer bg-white shadow-md hover:shadow-lg hover:bg-gray-50 transition-all"
              onClick={() => onFolderClick(folder.id)}
            >
              <Folder size={24} className="mr-4 text-blue-500" />
              <span className="text-lg font-medium text-gray-800 flex-grow">{folder.name}</span>
              {(canEdit || canRemove) && (
              <div className="flex space-x-2">
                {canEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(folder); }}
                  className="p-2 rounded-full hover:bg-gray-200"
                   aria-label={`Edit folder ${folder.name}`}
                >
                  <Pencil size={16} />
                </button>
                )}
                {canRemove && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }}
                  className="p-2 rounded-full hover:bg-gray-200"
                   aria-label={`Delete folder ${folder.name}`}
                >
                  <Trash2 size={16} />
                </button>
                )}
              </div>
              )}
            </li>
          ))}
          {kahoots.map((kahoot) => (
            <li
              key={`kahoot-${kahoot.id}`}
              className="flex items-center p-4 rounded-lg bg-white shadow-md"
            >
              <FileText size={24} className="mr-4 text-green-500" />
              <span className="text-lg font-medium text-gray-800">{kahoot.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}