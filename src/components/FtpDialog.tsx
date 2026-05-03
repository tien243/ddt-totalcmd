import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Wifi, WifiOff, X, Loader2 } from 'lucide-react';

interface Props {
  onConnect: (host: string, port: number, user: string, pass: string) => Promise<void>;
  onClose: () => void;
}

export const FtpDialog: React.FC<Props> = ({ onConnect, onClose }) => {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('21');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    if (!host) { setError('Host is required'); return; }
    setLoading(true);
    setError('');
    try {
      await onConnect(host, parseInt(port) || 21, username || 'anonymous', password || '');
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-96 rounded-xl border border-white/10 shadow-2xl"
        style={{ backgroundColor: '#1e1e1e' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Wifi size={16} className="text-blue-400" />
            <span className="text-sm font-semibold text-white">FTP Connection</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Host</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="ftp.example.com"
              className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="anonymous"
              className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-900/20 border border-red-500/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs rounded-md border border-white/10 text-gray-400 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={loading}
            className="px-4 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
            Connect
          </button>
        </div>
      </div>
    </div>
  );
};

// Status bar component to show FTP connection state
export const FtpStatusBar: React.FC<{ connected: boolean; host: string; onDisconnect: () => void }> = ({
  connected, host, onDisconnect
}) => {
  if (!connected) return null;
  return (
    <div className="flex items-center gap-2 px-2 py-0.5 text-[10px] bg-green-900/30 border-t border-green-500/20">
      <Wifi size={10} className="text-green-400" />
      <span className="text-green-400">FTP: {host}</span>
      <button
        onClick={onDisconnect}
        className="ml-auto text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors"
      >
        <WifiOff size={10} />
        Disconnect
      </button>
    </div>
  );
};
