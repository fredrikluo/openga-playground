'use client';

import { useState } from 'react';
import { Folder, ChevronRight, ChevronDown, X } from 'lucide-react';

interface FolderItem {
  id: string;
  name: string;
  parent_folder_id: string | null;
}

interface FolderPickerModalProps {
  folders: FolderItem[];
  rootFolderId: string;
  excludeFolderId?: string; // Cannot move a folder into itself or its children
  currentParentId: string | null;
  onSelect: (folderId: string) => void;
  onClose: () => void;
  title: string;
}

function FolderTree({
  folders,
  parentId,
  excludeFolderId,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
  depth = 0,
}: {
  folders: FolderItem[];
  parentId: string;
  excludeFolderId?: string;
  selectedId: string | null;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  const children = folders.filter(f => f.parent_folder_id === parentId && f.id !== excludeFolderId);

  if (children.length === 0) return null;

  return (
    <ul className={depth > 0 ? 'ml-4' : ''}>
      {children.map(folder => {
        const hasChildren = folders.some(f => f.parent_folder_id === folder.id && f.id !== excludeFolderId);
        const isExpanded = expandedIds.has(folder.id);
        const isSelected = selectedId === folder.id;

        return (
          <li key={folder.id}>
            <div
              className={`flex items-center gap-1 py-1.5 px-2 rounded cursor-pointer transition ${
                isSelected ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
              }`}
              onClick={() => onSelect(folder.id)}
            >
              {hasChildren ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggle(folder.id); }}
                  className="p-0.5"
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <span className="w-5" />
              )}
              <Folder size={16} className="text-blue-500 flex-shrink-0" />
              <span className="text-sm truncate">{folder.name}</span>
            </div>
            {hasChildren && isExpanded && (
              <FolderTree
                folders={folders}
                parentId={folder.id}
                excludeFolderId={excludeFolderId}
                selectedId={selectedId}
                expandedIds={expandedIds}
                onToggle={onToggle}
                onSelect={onSelect}
                depth={depth + 1}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function FolderPickerModal({
  folders,
  rootFolderId,
  excludeFolderId,
  currentParentId,
  onSelect,
  onClose,
  title,
}: FolderPickerModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Auto-expand the path to current parent
    const expanded = new Set<string>();
    expanded.add(rootFolderId);
    if (currentParentId) {
      let id: string | null = currentParentId;
      while (id) {
        expanded.add(id);
        const folder = folders.find(f => f.id === id);
        id = folder?.parent_folder_id ?? null;
      }
    }
    return expanded;
  });

  const handleToggle = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 flex-grow">
          <FolderTree
            folders={folders}
            parentId={rootFolderId}
            excludeFolderId={excludeFolderId}
            selectedId={selectedId}
            expandedIds={expandedIds}
            onToggle={handleToggle}
            onSelect={setSelectedId}
          />
          {folders.filter(f => f.parent_folder_id === rootFolderId).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No folders available</p>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedId && onSelect(selectedId)}
            disabled={!selectedId || selectedId === currentParentId}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Move here
          </button>
        </div>
      </div>
    </div>
  );
}
