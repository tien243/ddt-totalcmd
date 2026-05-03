import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useFileStore } from '../store/useFileStore';
import {
  FileText, Folder, Calendar, HardDrive, Shield, Link2, Hash, X
} from 'lucide-react';

interface FileInfo {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: number;
  created: number;
  permissions: string;
  is_symlink: boolean;
  symlink_target: string | null;
  extension: string | null;
  mime_type: string;
}

function formatSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(timestamp: number) {
  if (timestamp === 0) return '—';
  return new Date(timestamp * 1000).toLocaleString();
}

function permToRwx(octal: string): string {
  const map: Record<string, string> = {
    '0': '---', '1': '--x', '2': '-w-', '3': '-wx',
    '4': 'r--', '5': 'r-x', '6': 'rw-', '7': 'rwx',
  };
  return octal.split('').map(c => map[c] || '---').join('');
}

interface Props {
  side: 'left' | 'right';
  onClose: () => void;
}

export const FileInfoPanel: React.FC<Props> = ({ side, onClose }) => {
  const state = useFileStore((s) => s[side]);
  const [info, setInfo] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const currentEntry = state.entries[state.cursorIndex];

  useEffect(() => {
    if (!currentEntry) {
      setInfo(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    invoke<FileInfo>('get_file_info', { path: currentEntry.path })
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch(() => {
        if (!cancelled) setInfo(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentEntry?.path]);

  if (!currentEntry) return null;

  const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-white/5">
      <span className="text-gray-500 shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
        <div className="text-xs text-gray-300 break-all">{value}</div>
      </div>
    </div>
  );

  return (
    <div
      className="w-60 shrink-0 border-l border-white/10 flex flex-col overflow-hidden"
      style={{ backgroundColor: '#1a1a1a' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0" style={{ backgroundColor: '#222' }}>
        <span className="text-xs font-semibold text-gray-300">File Info</span>
        <button onClick={onClose} className="p-0.5 hover:bg-white/10 rounded text-gray-500">
          <X size={14} />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : info ? (
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {/* File icon & name */}
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#2a2a2a' }}>
              {info.is_dir ? (
                <Folder size={20} className="text-blue-400" />
              ) : (
                <FileText size={20} className="text-gray-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{info.name}</div>
              <div className="text-[10px] text-gray-500">{info.mime_type}</div>
            </div>
          </div>

          <InfoRow icon={<HardDrive size={12} />} label="Size" value={info.is_dir ? 'Directory' : formatSize(info.size)} />
          <InfoRow icon={<Calendar size={12} />} label="Modified" value={formatDate(info.modified)} />
          <InfoRow icon={<Calendar size={12} />} label="Created" value={formatDate(info.created)} />
          <InfoRow icon={<Shield size={12} />} label="Permissions" value={`${info.permissions} (${permToRwx(info.permissions)})`} />
          {info.extension && (
            <InfoRow icon={<Hash size={12} />} label="Extension" value={`.${info.extension}`} />
          )}
          {info.is_symlink && info.symlink_target && (
            <InfoRow icon={<Link2 size={12} />} label="Symlink Target" value={info.symlink_target} />
          )}
          <InfoRow icon={<FileText size={12} />} label="Path" value={info.path} />
        </div>
      ) : null}
    </div>
  );
};
