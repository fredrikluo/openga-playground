'use client';

import { Folder, FileText, ArrowLeft, Pencil, Trash2, Info, MoveRight, Copy } from 'lucide-react';

interface Kahoot {
  id: string;
  name: string;
}

interface SubFolder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  organization_id: string;
}

interface FolderViewProps {
  folders: SubFolder[];
  kahoots: Kahoot[];
  currentFolder: { id: string; name: string; parent_folder_id: string | null } | null;
  onFolderClick: (folderId: string) => void;
  onBackClick: () => void;
  viewType: 'grid' | 'list';
  onEdit: (folder: SubFolder) => void;
  onDelete: (folderId: string) => void;
  onFolderSelect?: (folder: SubFolder) => void;
  onKahootSelect?: (kahoot: Kahoot) => void;
  onKahootDelete?: (kahootId: string) => void;
  onFolderMove?: (folder: SubFolder) => void;
  onKahootMove?: (kahoot: Kahoot) => void;
  onKahootDuplicate?: (kahoot: Kahoot) => void;
  selectedItemId?: string;
  permissions?: Record<string, boolean>;
  visibilityMode?: 'off' | 'show-all' | 'hide';
  viewableItems?: Record<string, boolean>;
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
  onFolderSelect,
  onKahootSelect,
  onKahootDelete,
  onFolderMove,
  onKahootMove,
  onKahootDuplicate,
  selectedItemId,
  visibilityMode = 'off',
  viewableItems = {},
}: FolderViewProps) {
  const isVisible = (id: string) => visibilityMode === 'off' || viewableItems[id] !== false;
  const isDimmed = (id: string) => visibilityMode === 'show-all' && viewableItems[id] === false;

  const visibleFolders = visibilityMode === 'hide'
    ? folders.filter(f => viewableItems[f.id] !== false)
    : folders;
  const visibleKahoots = visibilityMode === 'hide'
    ? kahoots.filter(k => viewableItems[k.id] !== false)
    : kahoots;
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {visibleFolders.map((folder) => (
            <div
              key={`folder-${folder.id}`}
              className={`relative flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer bg-white shadow-md hover:shadow-lg transition-all ${
                isDimmed(folder.id) ? 'opacity-30' : ''
              } ${
                selectedItemId === folder.id ? 'ring-2 ring-purple-400 bg-purple-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => onFolderClick(folder.id)}
            >
              <Folder size={48} className="text-blue-500" />
              <span className="mt-2 text-sm font-medium text-center text-gray-700 truncate w-full">{folder.name}</span>
              <div className="absolute top-1 right-1 flex">
                <button
                  onClick={(e) => { e.stopPropagation(); onFolderSelect?.(folder); }}
                  className="p-1 rounded-full hover:bg-gray-200"
                  aria-label={`Info for ${folder.name}`}
                >
                  <Info size={14} className="text-purple-500" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(folder); }}
                  className="p-1 rounded-full hover:bg-gray-200"
                  aria-label={`Edit ${folder.name}`}
                >
                  <Pencil size={14} className="text-gray-500" />
                </button>
                {onFolderMove && (
                <button
                  onClick={(e) => { e.stopPropagation(); onFolderMove(folder); }}
                  className="p-1 rounded-full hover:bg-gray-200"
                  aria-label={`Move ${folder.name}`}
                >
                  <MoveRight size={14} className="text-gray-500" />
                </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }}
                  className="p-1 rounded-full hover:bg-gray-200"
                  aria-label={`Delete ${folder.name}`}
                >
                  <Trash2 size={14} className="text-gray-500" />
                </button>
              </div>
            </div>
          ))}
          {visibleKahoots.map((kahoot) => (
            <div
              key={`kahoot-${kahoot.id}`}
              className={`relative flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer bg-white shadow-md hover:shadow-lg transition-all ${
                isDimmed(kahoot.id) ? 'opacity-30' : ''
              } ${
                selectedItemId === kahoot.id ? 'ring-2 ring-purple-400 bg-purple-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => onKahootSelect?.(kahoot)}
            >
              <FileText size={48} className="text-green-500" />
              <span className="mt-2 text-sm font-medium text-center text-gray-700 truncate w-full">{kahoot.name}</span>
              {(onKahootDelete || onKahootDuplicate) && (
                <div className="absolute top-1 right-1 flex">
                  <button
                    onClick={(e) => { e.stopPropagation(); onKahootSelect?.(kahoot); }}
                    className="p-1 rounded-full hover:bg-gray-200"
                    aria-label={`Info for ${kahoot.name}`}
                  >
                    <Info size={14} className="text-purple-500" />
                  </button>
                  {onKahootDuplicate && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onKahootDuplicate(kahoot); }}
                    className="p-1 rounded-full hover:bg-gray-200"
                    aria-label={`Duplicate ${kahoot.name}`}
                  >
                    <Copy size={14} className="text-gray-500" />
                  </button>
                  )}
                  {onKahootMove && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onKahootMove(kahoot); }}
                    className="p-1 rounded-full hover:bg-gray-200"
                    aria-label={`Move ${kahoot.name}`}
                  >
                    <MoveRight size={14} className="text-gray-500" />
                  </button>
                  )}
                  {onKahootDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onKahootDelete(kahoot.id); }}
                    className="p-1 rounded-full hover:bg-gray-200"
                    aria-label={`Delete ${kahoot.name}`}
                  >
                    <Trash2 size={14} className="text-gray-500" />
                  </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {visibleFolders.map((folder) => (
            <li
              key={`folder-${folder.id}`}
              className={`flex items-center p-3 rounded-lg cursor-pointer bg-white shadow-sm hover:shadow-md transition-all ${
                isDimmed(folder.id) ? 'opacity-30' : ''
              } ${
                selectedItemId === folder.id ? 'ring-2 ring-purple-400 bg-purple-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => onFolderClick(folder.id)}
            >
              <Folder size={22} className="mr-3 text-blue-500 flex-shrink-0" />
              <span className="text-base font-medium text-gray-800 flex-grow truncate">{folder.name}</span>
              <div className="flex space-x-1 flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onFolderSelect?.(folder); }}
                  className="p-1.5 rounded-full hover:bg-gray-200"
                >
                  <Info size={14} className="text-purple-500" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(folder); }}
                  className="p-1.5 rounded-full hover:bg-gray-200"
                >
                  <Pencil size={14} />
                </button>
                {onFolderMove && (
                <button
                  onClick={(e) => { e.stopPropagation(); onFolderMove(folder); }}
                  className="p-1.5 rounded-full hover:bg-gray-200"
                >
                  <MoveRight size={14} />
                </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }}
                  className="p-1.5 rounded-full hover:bg-gray-200"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
          {visibleKahoots.map((kahoot) => (
            <li
              key={`kahoot-${kahoot.id}`}
              className={`flex items-center p-3 rounded-lg cursor-pointer bg-white shadow-sm hover:shadow-md transition-all ${
                isDimmed(kahoot.id) ? 'opacity-30' : ''
              } ${
                selectedItemId === kahoot.id ? 'ring-2 ring-purple-400 bg-purple-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => onKahootSelect?.(kahoot)}
            >
              <FileText size={22} className="mr-3 text-green-500 flex-shrink-0" />
              <span className="text-base font-medium text-gray-800 flex-grow truncate">{kahoot.name}</span>
              {(onKahootDelete || onKahootMove || onKahootDuplicate) && (
                <div className="flex space-x-1 flex-shrink-0">
                  {onKahootDuplicate && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onKahootDuplicate(kahoot); }}
                    className="p-1.5 rounded-full hover:bg-gray-200"
                  >
                    <Copy size={14} />
                  </button>
                  )}
                  {onKahootMove && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onKahootMove(kahoot); }}
                    className="p-1.5 rounded-full hover:bg-gray-200"
                  >
                    <MoveRight size={14} />
                  </button>
                  )}
                  {onKahootDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onKahootDelete(kahoot.id); }}
                    className="p-1.5 rounded-full hover:bg-gray-200"
                  >
                    <Trash2 size={14} />
                  </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
