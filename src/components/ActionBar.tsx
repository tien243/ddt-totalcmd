import React from 'react';

const buttons = [
  { key: 'F3', label: 'View' },
  { key: 'F4', label: 'Edit' },
  { key: 'F5', label: 'Copy' },
  { key: 'F6', label: 'Move' },
  { key: 'F7', label: 'MkDir' },
  { key: 'F8', label: 'Delete' },
];

export const ActionBar: React.FC = () => {
  return (
    <div className="flex gap-1 p-1 bg-[#121212] border-t border-white/10">
      {buttons.map((btn) => (
        <button
          key={btn.key}
          className="flex-1 py-1 px-2 bg-[#2a2a2a] hover:bg-blue-600 active:bg-blue-800 text-xs rounded transition-colors border border-white/5 shadow-sm flex items-center justify-center gap-2 group"
        >
          <span className="opacity-50 font-bold group-hover:opacity-100">{btn.key}</span>
          <span>{btn.label}</span>
        </button>
      ))}
    </div>
  );
};
