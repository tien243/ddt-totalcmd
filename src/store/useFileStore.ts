import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: number;
  extension?: string;
}

export interface QuickPath {
  label: string;
  path: string;
}

export type SortField = 'name' | 'size' | 'modified';
export type SortOrder = 'asc' | 'desc';

interface PaneState {
  protocol: 'local' | 'ftp';
  path: string;
  entries: FileEntry[];
  cursorIndex: number;
  selectedIndices: number[];
  history: string[];
  historyIndex: number;
}

interface FileStore {
  left: PaneState;
  right: PaneState;
  activePane: 'left' | 'right';
  showHidden: boolean;
  sortField: SortField;
  sortOrder: SortOrder;
  quickPaths: QuickPath[];
  
  // Actions
  setPath: (pane: 'left' | 'right', path: string, protocol?: 'local' | 'ftp') => Promise<void>;
  refresh: (pane: 'left' | 'right') => Promise<void>;
  setCursor: (pane: 'left' | 'right', index: number) => void;
  toggleSelection: (pane: 'left' | 'right', index: number) => void;
  setActivePane: (pane: 'left' | 'right') => void;
  toggleHidden: () => void;
  setSort: (field: SortField) => void;
  loadQuickPaths: () => Promise<void>;
  connectToFtp: (pane: 'left' | 'right', host: string, port: number, user: string, pass: string) => Promise<void>;
}

const initialPaneState: PaneState = {
  protocol: 'local',
  path: '/',
  entries: [],
  cursorIndex: 0,
  selectedIndices: [],
  history: ['/'],
  historyIndex: 0,
};

function sortEntries(entries: FileEntry[], field: SortField, order: SortOrder): FileEntry[] {
  return [...entries].sort((a, b) => {
    // Directories always first
    if (a.is_dir !== b.is_dir) {
      return b.is_dir ? 1 : -1;
    }
    
    let cmp = 0;
    switch (field) {
      case 'name':
        cmp = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        break;
      case 'size':
        cmp = a.size - b.size;
        break;
      case 'modified':
        cmp = a.modified - b.modified;
        break;
    }
    return order === 'asc' ? cmp : -cmp;
  });
}

export const useFileStore = create<FileStore>((set, get) => ({
  left: { ...initialPaneState },
  right: { ...initialPaneState },
  activePane: 'left',
  showHidden: false,
  sortField: 'name',
  sortOrder: 'asc',
  quickPaths: [],

  setPath: async (pane, path, protocol) => {
    try {
      const { showHidden, sortField, sortOrder } = get();
      const currentProtocol = protocol || get()[pane].protocol;
      
      const cmd = currentProtocol === 'ftp' ? 'ftp_list' : 'list_directory';
      const rawEntries = await invoke<FileEntry[]>(cmd, { path, showHidden });
      const entries = sortEntries(rawEntries, sortField, sortOrder);
      
      set((state) => {
        const paneState = state[pane];
        const newHistory = paneState.history.slice(0, paneState.historyIndex + 1);
        if (newHistory[newHistory.length - 1] !== path) {
          newHistory.push(path);
        }
        
        return {
          [pane]: {
            ...paneState,
            protocol: currentProtocol,
            path,
            entries,
            cursorIndex: 0,
            selectedIndices: [],
            history: newHistory,
            historyIndex: newHistory.length - 1,
          },
        };
      });
    } catch (error) {
      console.error(`Failed to list directory: ${error}`);
    }
  },

  refresh: async (pane) => {
    const { showHidden, sortField, sortOrder } = get();
    const { path, protocol } = get()[pane];
    try {
      const cmd = protocol === 'ftp' ? 'ftp_list' : 'list_directory';
      const rawEntries = await invoke<FileEntry[]>(cmd, { path, showHidden });
      const entries = sortEntries(rawEntries, sortField, sortOrder);
      set((state) => ({
        [pane]: {
          ...state[pane],
          entries,
          selectedIndices: [],
        },
      }));
    } catch (error) {
      console.error(`Failed to refresh: ${error}`);
    }
  },

  setCursor: (pane, index) => {
    set((state) => ({
      [pane]: {
        ...state[pane],
        cursorIndex: Math.max(0, Math.min(index, state[pane].entries.length - 1)),
      },
    }));
  },

  toggleSelection: (pane, index) => {
    set((state) => {
      const selectedIndices = [...state[pane].selectedIndices];
      const foundIndex = selectedIndices.indexOf(index);
      if (foundIndex > -1) {
        selectedIndices.splice(foundIndex, 1);
      } else {
        selectedIndices.push(index);
      }
      return {
        [pane]: {
          ...state[pane],
          selectedIndices,
        },
      };
    });
  },

  setActivePane: (pane) => set({ activePane: pane }),

  toggleHidden: () => {
    const newVal = !get().showHidden;
    set({ showHidden: newVal });
    // Refresh both panes
    get().refresh('left');
    get().refresh('right');
  },

  setSort: (field) => {
    const { sortField, sortOrder } = get();
    const newOrder = field === sortField ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc';
    set({ sortField: field, sortOrder: newOrder });
    // Re-sort both panes
    get().refresh('left');
    get().refresh('right');
  },

  loadQuickPaths: async () => {
    try {
      const paths = await invoke<QuickPath[]>('get_quick_paths');
      set({ quickPaths: paths });
    } catch (error) {
      console.error(`Failed to load quick paths: ${error}`);
    }
  },

  connectToFtp: async (pane, host, port, username, password) => {
    try {
      const pwd = await invoke<string>('ftp_connect', { host, port, username, password });
      await get().setPath(pane, pwd, 'ftp');
    } catch (error) {
      throw error;
    }
  },
}));
