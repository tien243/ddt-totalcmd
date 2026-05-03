import React, { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FileEntry } from '../store/useFileStore';
import {
  ExternalLink, FileEdit, FolderOpen, Terminal,
  Copy, Scissors, Trash2, Type
} from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  entry: FileEntry;
  onClose: () => void;
  onCopy: () => void;
  onMove: () => void;
  onDelete: () => void;
  onRename: () => void;
  protocol: 'local' | 'ftp';
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  separator?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

const OPEN_WITH_APPS = [
  { name: 'Antigravity', app: 'Antigravity' },
  { name: 'Visual Studio Code', app: 'Visual Studio Code' },
  { name: 'Sublime Text', app: 'Sublime Text' },
  { name: 'TextEdit', app: 'TextEdit' },
  { name: 'Preview', app: 'Preview' },
  { name: 'Safari', app: 'Safari' },
  { name: 'Finder', app: 'Finder' },
];

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x, y, entry, onClose, onCopy, onMove, onDelete, onRename, protocol
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showOpenWith, setShowOpenWith] = React.useState(false);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (rect.right > vw) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > vh) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  const menuItems: MenuItem[] = [
    {
      label: 'Open',
      icon: <ExternalLink size={14} />,
      onClick: () => {
        invoke('open_with_default_app', { path: entry.path });
        onClose();
      },
      disabled: protocol === 'ftp',
    },
    {
      label: 'Open with Editor',
      icon: <FileEdit size={14} />,
      onClick: () => {
        invoke('open_with_editor', { path: entry.path });
        onClose();
      },
      disabled: protocol === 'ftp',
    },
    {
      label: 'Open With...',
      icon: <ExternalLink size={14} />,
      onClick: () => setShowOpenWith(!showOpenWith),
      disabled: protocol === 'ftp',
    },
    {
      label: '',
      icon: null,
      onClick: () => {},
      separator: true,
    },
    {
      label: 'Reveal in Finder',
      icon: <FolderOpen size={14} />,
      onClick: () => {
        invoke('reveal_in_finder', { path: entry.path });
        onClose();
      },
      disabled: protocol === 'ftp',
    },
    {
      label: 'Open in Terminal',
      icon: <Terminal size={14} />,
      onClick: () => {
        invoke('open_in_terminal', { path: entry.path });
        onClose();
      },
      disabled: protocol === 'ftp',
    },
    {
      label: '',
      icon: null,
      onClick: () => {},
      separator: true,
    },
    {
      label: 'Copy',
      icon: <Copy size={14} />,
      onClick: () => { onCopy(); onClose(); },
    },
    {
      label: 'Move',
      icon: <Scissors size={14} />,
      onClick: () => { onMove(); onClose(); },
    },
    {
      label: 'Rename',
      icon: <Type size={14} />,
      onClick: () => { onRename(); onClose(); },
    },
    {
      label: '',
      icon: null,
      onClick: () => {},
      separator: true,
    },
    {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      onClick: () => { onDelete(); onClose(); },
      danger: true,
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[200px] rounded-lg border border-white/10 shadow-2xl py-1 backdrop-blur-xl"
      style={{
        left: x,
        top: y,
        backgroundColor: 'rgba(30, 30, 30, 0.95)',
      }}
    >
      {/* Header: file name */}
      <div className="px-3 py-1.5 text-[10px] text-gray-500 truncate border-b border-white/5">
        {entry.name}
      </div>

      {menuItems.map((item, i) => {
        if (item.separator) {
          return <div key={i} className="my-1 border-t border-white/5" />;
        }
        return (
          <button
            key={i}
            onClick={item.onClick}
            disabled={item.disabled}
            className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2.5 transition-colors ${
              item.disabled
                ? 'opacity-30 cursor-not-allowed'
                : item.danger
                  ? 'text-red-400 hover:bg-red-600/20'
                  : 'text-gray-300 hover:bg-blue-600/30 hover:text-white'
            }`}
          >
            <span className="w-4 shrink-0 opacity-70">{item.icon}</span>
            {item.label}
          </button>
        );
      })}

      {/* Open With submenu */}
      {showOpenWith && (
        <div
          className="border-t border-white/5 py-1"
          style={{ backgroundColor: 'rgba(25, 25, 25, 0.95)' }}
        >
          <div className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wider">
            Open With Application
          </div>
          {OPEN_WITH_APPS.map((app) => (
            <button
              key={app.app}
              onClick={() => {
                invoke('open_with_app', { path: entry.path, appName: app.app });
                onClose();
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-blue-600/30 hover:text-white transition-colors flex items-center gap-2"
            >
              <ExternalLink size={12} className="opacity-50" />
              {app.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
