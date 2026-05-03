import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useFileStore } from "./store/useFileStore";
import { FilePane } from "./components/FilePane";
import { ActionBar } from "./components/ActionBar";
import { FileInfoPanel } from "./components/FileInfoPanel";
import { FtpDialog, FtpStatusBar } from "./components/FtpDialog";
import { Settings, Search, Eye, EyeOff, Wifi, Info } from "lucide-react";

function App() {
  const { setPath, showHidden, toggleHidden, loadQuickPaths, activePane, connectToFtp } = useFileStore();
  const [initialized, setInitialized] = useState(false);
  const [showFileInfo, setShowFileInfo] = useState(false);
  const [showFtpDialog, setShowFtpDialog] = useState(false);
  const [ftpConnected, setFtpConnected] = useState(false);
  const [ftpHost, setFtpHost] = useState('');

  useEffect(() => {
    const init = async () => {
      const home = await invoke<string>("get_home_dir");
      await loadQuickPaths();
      await setPath("left", home);
      await setPath("right", home);
      setInitialized(true);
    };
    init();
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      const state = useFileStore.getState();
      const ap = state.activePane;
      const inactivePane = ap === "left" ? "right" : "left";
      const currentPaneState = state[ap];
      const targetPaneState = state[inactivePane];

      if (e.key === "Tab") {
        e.preventDefault();
        state.setActivePane(inactivePane);
        return;
      }

      // Ctrl+H — toggle hidden files
      if ((e.ctrlKey || e.metaKey) && e.key === "h") {
        e.preventDefault();
        state.toggleHidden();
        return;
      }

      // Ctrl+I — toggle file info panel
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        setShowFileInfo(prev => !prev);
        return;
      }

      const getItemsToProcess = () => {
        if (currentPaneState.selectedIndices.length > 0) {
          return currentPaneState.selectedIndices.map(i => currentPaneState.entries[i]);
        }
        if (currentPaneState.entries.length > 0) {
          return [currentPaneState.entries[currentPaneState.cursorIndex]];
        }
        return [];
      };

      // F3 — Open with default app
      if (e.key === "F3") {
        e.preventDefault();
        const entry = currentPaneState.entries[currentPaneState.cursorIndex];
        if (entry) {
          await invoke("open_with_default_app", { path: entry.path });
        }
      }

      // F4 — Open with editor
      if (e.key === "F4") {
        e.preventDefault();
        const entry = currentPaneState.entries[currentPaneState.cursorIndex];
        if (entry && !entry.is_dir) {
          await invoke("open_with_editor", { path: entry.path });
        }
      }

      if (e.key === "F5" || e.key === "F6") {
        e.preventDefault();
        const isMove = e.key === "F6";
        const items = getItemsToProcess();
        if (items.length === 0) return;

        const actionName = isMove ? "Move" : "Copy";
        const confirmed = window.confirm(
          `${actionName} ${items.length} item(s) to ${targetPaneState.path}?`
        );
        
        if (confirmed) {
          try {
            const srcProto = currentPaneState.protocol;
            const dstProto = targetPaneState.protocol;

            for (const item of items) {
              const dest = `${targetPaneState.path}/${item.name}`;
              
              if (srcProto === 'local' && dstProto === 'local') {
                await invoke(isMove ? "move_item" : "copy_item", { source: item.path, destination: dest });
              } 
              else if (srcProto === 'local' && dstProto === 'ftp') {
                await invoke("ftp_upload", { localPath: item.path, remotePath: dest });
                if (isMove) await invoke("delete_item", { path: item.path });
              }
              else if (srcProto === 'ftp' && dstProto === 'local') {
                await invoke("ftp_download", { remotePath: item.path, localPath: dest });
                if (isMove) await invoke("ftp_delete", { path: item.path });
              }
              else if (srcProto === 'ftp' && dstProto === 'ftp') {
                if (isMove) {
                  await invoke("ftp_rename", { source: item.path, destination: dest });
                } else {
                  window.alert("FTP to FTP direct copy is not supported yet.");
                  break;
                }
              }
            }
            state.refresh("left");
            state.refresh("right");
          } catch (err) {
            window.alert(`Error: ${err}`);
          }
        }
      }

      if (e.key === "F7") {
        e.preventDefault();
        const folderName = window.prompt("New folder name:");
        if (folderName) {
          try {
            const dest = `${currentPaneState.path}/${folderName}`;
            const cmd = currentPaneState.protocol === 'ftp' ? 'ftp_mkdir' : 'create_directory';
            await invoke(cmd, { path: dest });
            state.refresh(ap);
          } catch (err) {
            window.alert(`Error: ${err}`);
          }
        }
      }

      if (e.key === "F8" || e.key === "Delete") {
        e.preventDefault();
        const items = getItemsToProcess();
        if (items.length === 0) return;

        const confirmed = window.confirm(
          `Delete ${items.length} item(s)? This cannot be undone!`
        );
        
        if (confirmed) {
          try {
            const cmd = currentPaneState.protocol === 'ftp' ? 'ftp_delete' : 'delete_item';
            for (const item of items) {
              await invoke(cmd, { path: item.path });
            }
            state.refresh(ap);
          } catch (err) {
            window.alert(`Error: ${err}`);
          }
        }
      }
    };
    
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const handleFtpDisconnect = async () => {
    await invoke("ftp_disconnect");
    setFtpConnected(false);
    setFtpHost('');
  };

  if (!initialized) {
    return (
      <div className="h-screen w-screen bg-[#0f0f0f] flex items-center justify-center text-white font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="animate-pulse text-sm text-gray-400">Initializing DDT Commander...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0f0f0f] text-gray-200 overflow-hidden font-sans select-none">
      {/* Top Header */}
      <header className="h-10 bg-[#1a1a1a] border-b border-white/5 flex items-center px-3 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-blue-400 font-bold tracking-tight text-sm flex items-center gap-1.5">
            <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-black">D</div>
            DDT COMMANDER
          </h1>
        </div>
        
        <div className="flex-1 max-w-sm mx-6">
          <div className="relative group">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400" />
            <input 
              type="text" 
              placeholder="Quick Search (Ctrl+F)"
              className="w-full bg-black/30 border border-white/10 rounded-md py-1 pl-8 pr-3 text-xs focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* FTP button */}
          <button
            onClick={() => setShowFtpDialog(true)}
            className={`p-1.5 rounded transition-colors text-xs flex items-center gap-1 ${
              ftpConnected ? 'text-green-400 bg-green-600/20' : 'text-gray-500 hover:text-gray-300'
            }`}
            title="FTP Connection"
          >
            <Wifi size={14} />
          </button>
          {/* File info toggle */}
          <button
            onClick={() => setShowFileInfo(prev => !prev)}
            className={`p-1.5 rounded transition-colors ${
              showFileInfo ? 'text-blue-400 bg-blue-600/20' : 'text-gray-500 hover:text-gray-300'
            }`}
            title="File Info (Ctrl+I)"
          >
            <Info size={14} />
          </button>
          {/* Hidden files toggle */}
          <button
            onClick={toggleHidden}
            className={`p-1.5 rounded transition-colors ${
              showHidden ? 'text-blue-400 bg-blue-600/20' : 'text-gray-500 hover:text-gray-300'
            }`}
            title="Toggle hidden files (Ctrl+H)"
          >
            {showHidden ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button className="p-1.5 hover:bg-white/5 rounded text-gray-400">
            <Settings size={15} />
          </button>
        </div>
      </header>

      {/* FTP Status */}
      <FtpStatusBar connected={ftpConnected} host={ftpHost} onDisconnect={handleFtpDisconnect} />

      {/* Main Content */}
      <main className="flex-1 flex gap-0.5 p-1 overflow-hidden min-h-0">
        <div className="flex-1 h-full min-w-0">
          <FilePane side="left" />
        </div>
        <div className="w-px bg-white/5 shrink-0"></div>
        <div className="flex-1 h-full min-w-0">
          <FilePane side="right" />
        </div>
        {/* File Info Panel */}
        {showFileInfo && (
          <FileInfoPanel
            side={activePane}
            onClose={() => setShowFileInfo(false)}
          />
        )}
      </main>

      {/* Action Buttons */}
      <ActionBar />

      {/* FTP Dialog */}
      {showFtpDialog && (
        <FtpDialog
          onClose={() => setShowFtpDialog(false)}
          onConnect={async (host, port, user, pass) => {
            await connectToFtp(activePane, host, port, user, pass);
            setFtpConnected(true);
            setFtpHost(host);
            setShowFtpDialog(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
