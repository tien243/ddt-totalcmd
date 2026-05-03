import React, { useRef, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useFileStore, FileEntry, SortField } from '../store/useFileStore';
import { ContextMenu } from './ContextMenu';
import {
  Folder, File, ChevronRight, ChevronDown, ChevronUp, Eye, EyeOff,
  Home, Download, FileText, Image, Music, Film, HardDrive, AppWindow, FolderOpen
} from 'lucide-react';

interface FilePaneProps {
  side: 'left' | 'right';
}

const QUICK_PATH_ICONS: Record<string, React.ReactNode> = {
  'Home': <Home size={14} />,
  'Desktop': <AppWindow size={14} />,
  'Documents': <FileText size={14} />,
  'Downloads': <Download size={14} />,
  'Pictures': <Image size={14} />,
  'Music': <Music size={14} />,
  'Movies': <Film size={14} />,
  'Root': <HardDrive size={14} />,
  'Applications': <AppWindow size={14} />,
  'Volumes': <HardDrive size={14} />,
};

function formatSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(timestamp: number) {
  if (timestamp === 0) return '—';
  const d = new Date(timestamp * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const FilePane: React.FC<FilePaneProps> = ({ side }) => {
  const {
    [side]: state,
    activePane, setActivePane,
    setCursor, toggleSelection, setPath,
    showHidden, toggleHidden,
    sortField, sortOrder, setSort,
    quickPaths,
  } = useFileStore();
  const isActive = activePane === side;
  const activeRowRef = useRef<HTMLDivElement>(null);
  const [showQuickPaths, setShowQuickPaths] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entry: FileEntry } | null>(null);

  useEffect(() => {
    if (isActive && activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [state.cursorIndex, isActive]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isActive) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setCursor(side, state.cursorIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setCursor(side, state.cursorIndex - 1);
        break;
      case 'Enter': {
        const currentEntry = state.entries[state.cursorIndex];
        if (currentEntry && currentEntry.is_dir) {
          setPath(side, currentEntry.path);
        } else if (currentEntry) {
          invoke('open_with_default_app', { path: currentEntry.path });
        }
        break;
      }
      case 'Backspace':
        e.preventDefault();
        {
          const parentPath = state.path.split('/').slice(0, -1).join('/') || '/';
          setPath(side, parentPath);
        }
        break;
      case ' ':
        e.preventDefault();
        toggleSelection(side, state.cursorIndex);
        break;
      case 'F4':
        e.preventDefault();
        {
          const entry = state.entries[state.cursorIndex];
          if (entry && !entry.is_dir) {
            invoke('open_with_editor', { path: entry.path });
          }
        }
        break;
    }
  };

  // Breadcrumb segments
  const pathSegments = state.path === '/' ? ['/'] : state.path.split('/').filter(Boolean);
  
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc'
      ? <ChevronUp size={12} className="inline ml-0.5" />
      : <ChevronDown size={12} className="inline ml-0.5" />;
  };

  return (
    <div
      className={`flex flex-col h-full overflow-hidden rounded-lg transition-all duration-200 ${
        isActive
          ? 'border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
          : 'border border-white/10 opacity-80'
      }`}
      style={{ backgroundColor: '#1a1a1a' }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onFocus={() => setActivePane(side)}
    >
      {/* Toolbar: Quick path + Hidden toggle */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-white/10 shrink-0" style={{ backgroundColor: '#222' }}>
        {/* Quick path dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowQuickPaths(!showQuickPaths)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs hover:bg-white/10 transition-colors text-gray-300"
          >
            {state.protocol === 'ftp' ? (
              <Wifi size={13} className="text-green-400" />
            ) : (
              <FolderOpen size={13} className="text-blue-400" />
            )}
            <ChevronDown size={12} />
          </button>
          {showQuickPaths && (
            <div
              className="absolute top-full left-0 mt-1 w-48 rounded-lg shadow-xl border border-white/10 z-50 py-1"
              style={{ backgroundColor: '#2a2a2a' }}
            >
              <div className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wider">Local Paths</div>
              {quickPaths.map((qp) => (
                <button
                  key={qp.path}
                  onClick={() => {
                    setPath(side, qp.path, 'local');
                    setShowQuickPaths(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-blue-600/40 transition-colors ${
                    state.path === qp.path && state.protocol === 'local' ? 'text-blue-400 bg-blue-600/20' : 'text-gray-300'
                  }`}
                >
                  {QUICK_PATH_ICONS[qp.label] || <Folder size={14} />}
                  <span>{qp.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Breadcrumb */}
        <div className="flex-1 flex items-center gap-0.5 text-xs font-mono overflow-hidden min-w-0">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold mr-1 ${
            state.protocol === 'ftp' ? 'bg-green-600/20 text-green-400' : 'bg-blue-600/20 text-blue-400'
          }`}>
            {state.protocol.toUpperCase()}
          </span>
          {state.path === '/' ? (
            <span className="text-gray-400 px-1">/</span>
          ) : (
            pathSegments.map((segment, i) => {
              const fullPath = '/' + pathSegments.slice(0, i + 1).join('/');
              return (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight size={10} className="text-gray-600 shrink-0" />}
                  <button
                    onClick={() => setPath(side, fullPath)}
                    className="text-gray-400 hover:text-blue-400 truncate transition-colors px-0.5"
                    title={fullPath}
                  >
                    {segment}
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Hidden files toggle */}
        <button
          onClick={toggleHidden}
          className={`p-1 rounded transition-colors ${showHidden ? 'text-blue-400 bg-blue-600/20' : 'text-gray-500 hover:text-gray-300'}`}
          title={showHidden ? 'Hide hidden files' : 'Show hidden files'}
        >
          {showHidden ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      </div>

      {/* Column headers */}
      <div
        className="flex items-center px-2 text-[10px] uppercase tracking-wider text-gray-500 border-b border-white/5 shrink-0 select-none"
        style={{ backgroundColor: '#1e1e1e', height: '24px' }}
      >
        <div className="w-6 shrink-0"></div>
        <button
          onClick={() => setSort('name')}
          className="flex-1 text-left hover:text-gray-300 transition-colors"
        >
          Name <SortIcon field="name" />
        </button>
        <button
          onClick={() => setSort('size')}
          className="w-20 text-right hover:text-gray-300 transition-colors"
        >
          Size <SortIcon field="size" />
        </button>
        <button
          onClick={() => setSort('modified')}
          className="w-36 text-right hover:text-gray-300 transition-colors"
        >
          Modified <SortIcon field="modified" />
        </button>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {state.entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-500">
            Empty directory
          </div>
        ) : (
          state.entries.map((entry, index) => {
            const isCursor = state.cursorIndex === index && isActive;
            const isSelected = state.selectedIndices.includes(index);

            return (
              <div
                key={entry.path}
                ref={isCursor ? activeRowRef : undefined}
                className={`flex items-center px-2 cursor-default select-none border-b border-white/5 ${
                  isCursor ? 'bg-blue-600/40' : ''
                } ${isSelected ? 'text-yellow-400 font-semibold' : ''} ${
                  !isCursor && !isSelected ? 'hover:bg-white/5' : ''
                }`}
                style={{ height: '26px', lineHeight: '26px' }}
                onClick={() => {
                  setActivePane(side);
                  setCursor(side, index);
                }}
                onDoubleClick={() => {
                  if (entry.is_dir) {
                    setPath(side, entry.path);
                  } else {
                    invoke('open_with_default_app', { path: entry.path });
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setActivePane(side);
                  setCursor(side, index);
                  setContextMenu({ x: e.clientX, y: e.clientY, entry });
                }}
              >
                <div className="w-6 shrink-0 flex items-center justify-center opacity-70">
                  {entry.is_dir ? (
                    <Folder size={14} className="text-blue-400" />
                  ) : (
                    <File size={14} className="text-gray-400" />
                  )}
                </div>
                <span className="flex-1 truncate text-sm">{entry.name}</span>
                <span className="w-20 text-right text-xs opacity-50 shrink-0">
                  {entry.is_dir ? 'DIR' : formatSize(entry.size)}
                </span>
                <span className="w-36 text-right text-xs opacity-40 shrink-0">
                  {formatDate(entry.modified)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Pane footer */}
      <div className="shrink-0 px-2 py-0.5 text-[10px] text-gray-500 border-t border-white/5 flex justify-between" style={{ backgroundColor: '#1e1e1e' }}>
        <span>{state.entries.length} items</span>
        <span>{state.selectedIndices.length > 0 ? `${state.selectedIndices.length} selected` : ''}</span>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          entry={contextMenu.entry}
          protocol={state.protocol}
          onClose={() => setContextMenu(null)}
          onCopy={async () => {
            const store = useFileStore.getState();
            const target = store[side === 'left' ? 'right' : 'left'];
            const dest = `${target.path}/${contextMenu.entry.name}`;
            
            try {
              if (state.protocol === 'local' && target.protocol === 'local') {
                await invoke('copy_item', { source: contextMenu.entry.path, destination: dest });
              } else if (state.protocol === 'local' && target.protocol === 'ftp') {
                await invoke('ftp_upload', { localPath: contextMenu.entry.path, remotePath: dest });
              } else if (state.protocol === 'ftp' && target.protocol === 'local') {
                await invoke('ftp_download', { remotePath: contextMenu.entry.path, localPath: dest });
              }
              store.refresh('left');
              store.refresh('right');
            } catch (err) { window.alert(`Error: ${err}`); }
          }}
          onMove={async () => {
            const store = useFileStore.getState();
            const target = store[side === 'left' ? 'right' : 'left'];
            const dest = `${target.path}/${contextMenu.entry.name}`;
            
            try {
              if (state.protocol === 'local' && target.protocol === 'local') {
                await invoke('move_item', { source: contextMenu.entry.path, destination: dest });
              } else if (state.protocol === 'local' && target.protocol === 'ftp') {
                await invoke('ftp_upload', { localPath: contextMenu.entry.path, remotePath: dest });
                await invoke('delete_item', { path: contextMenu.entry.path });
              } else if (state.protocol === 'ftp' && target.protocol === 'local') {
                await invoke('ftp_download', { remotePath: contextMenu.entry.path, localPath: dest });
                await invoke('ftp_delete', { path: contextMenu.entry.path });
              } else if (state.protocol === 'ftp' && target.protocol === 'ftp') {
                await invoke('ftp_rename', { source: contextMenu.entry.path, destination: dest });
              }
              store.refresh('left');
              store.refresh('right');
            } catch (err) { window.alert(`Error: ${err}`); }
          }}
          onDelete={async () => {
            if (window.confirm(`Delete "${contextMenu.entry.name}"?`)) {
              try {
                const cmd = state.protocol === 'ftp' ? 'ftp_delete' : 'delete_item';
                await invoke(cmd, { path: contextMenu.entry.path });
                useFileStore.getState().refresh(side);
              } catch (err) { window.alert(`Error: ${err}`); }
            }
          }}
          onRename={async () => {
            const newName = window.prompt('Rename to:', contextMenu.entry.name);
            if (newName && newName !== contextMenu.entry.name) {
              const parentPath = state.path;
              try {
                const cmd = state.protocol === 'ftp' ? 'ftp_rename' : 'move_item';
                await invoke(cmd, {
                  source: contextMenu.entry.path,
                  destination: `${parentPath}/${newName}`
                });
                useFileStore.getState().refresh(side);
              } catch (err) { window.alert(`Error: ${err}`); }
            }
          }}
        />
      )}
    </div>
  );
};
