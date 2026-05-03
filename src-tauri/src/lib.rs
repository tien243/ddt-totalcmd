use serde::{Serialize, Deserialize};
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;
use std::os::unix::fs::PermissionsExt;

#[derive(Serialize, Deserialize, Debug)]
pub struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    size: u64,
    modified: u64,
    extension: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct QuickPath {
    label: String,
    path: String,
}

#[tauri::command]
fn list_directory(path: String, show_hidden: bool) -> Result<Vec<FileEntry>, String> {
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut file_list = Vec::new();

    for entry in entries {
        if let Ok(entry) = entry {
            if let Ok(meta) = entry.metadata() {
                let path_buf = entry.path();
                let name = path_buf.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();
                
                // Skip hidden files if show_hidden is false
                if !show_hidden && name.starts_with('.') {
                    continue;
                }

                let modified = meta.modified()
                    .map(|t| t.duration_since(UNIX_EPOCH).unwrap_or_default().as_secs())
                    .unwrap_or(0);

                file_list.push(FileEntry {
                    name,
                    path: path_buf.to_str().unwrap_or("").to_string(),
                    is_dir: meta.is_dir(),
                    size: meta.len(),
                    modified,
                    extension: path_buf.extension().and_then(|e| e.to_str()).map(|s| s.to_string()),
                });
            }
        }
    }

    // Sort: Directories first, then alphabetical
    file_list.sort_by(|a, b| {
        if a.is_dir != b.is_dir {
            b.is_dir.cmp(&a.is_dir)
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    Ok(file_list)
}

#[tauri::command]
fn open_with_default_app(path: String) -> Result<(), String> {
    std::process::Command::new("open")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn open_with_editor(path: String) -> Result<(), String> {
    // Try VS Code first, fall back to TextEdit
    let result = std::process::Command::new("code")
        .arg(&path)
        .spawn();
    
    match result {
        Ok(_) => Ok(()),
        Err(_) => {
            // Fallback to macOS default text editor
            std::process::Command::new("open")
                .arg("-t")
                .arg(&path)
                .spawn()
                .map_err(|e| e.to_string())?;
            Ok(())
        }
    }
}

#[tauri::command]
fn open_with_app(path: String, app_name: String) -> Result<(), String> {
    std::process::Command::new("open")
        .arg("-a")
        .arg(&app_name)
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open with {}: {}", app_name, e))?;
    Ok(())
}

#[tauri::command]
fn reveal_in_finder(path: String) -> Result<(), String> {
    std::process::Command::new("open")
        .arg("-R")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn open_in_terminal(path: String) -> Result<(), String> {
    let dir = if std::path::Path::new(&path).is_dir() {
        path.clone()
    } else {
        std::path::Path::new(&path)
            .parent()
            .map(|p| p.to_str().unwrap_or("/").to_string())
            .unwrap_or_else(|| "/".to_string())
    };
    std::process::Command::new("open")
        .arg("-a")
        .arg("Terminal")
        .arg(&dir)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_quick_paths() -> Result<Vec<QuickPath>, String> {
    let home = std::env::var("HOME").map_err(|_| "No HOME".to_string())?;
    let paths = vec![
        QuickPath { label: "Home".into(), path: home.clone() },
        QuickPath { label: "Desktop".into(), path: format!("{}/Desktop", home) },
        QuickPath { label: "Documents".into(), path: format!("{}/Documents", home) },
        QuickPath { label: "Downloads".into(), path: format!("{}/Downloads", home) },
        QuickPath { label: "Pictures".into(), path: format!("{}/Pictures", home) },
        QuickPath { label: "Music".into(), path: format!("{}/Music", home) },
        QuickPath { label: "Movies".into(), path: format!("{}/Movies", home) },
        QuickPath { label: "Root".into(), path: "/".into() },
        QuickPath { label: "Applications".into(), path: "/Applications".into() },
        QuickPath { label: "Volumes".into(), path: "/Volumes".into() },
    ];
    // Filter to only paths that actually exist
    Ok(paths.into_iter().filter(|p| Path::new(&p.path).exists()).collect())
}

#[tauri::command]
fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_item(path: String) -> Result<(), String> {
    let path = Path::new(&path);
    if path.is_dir() {
        fs::remove_dir_all(path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn move_item(source: String, destination: String) -> Result<(), String> {
    fs::rename(source, destination).map_err(|e| e.to_string())
}

#[tauri::command]
fn copy_item(source: String, destination: String) -> Result<(), String> {
    let src = Path::new(&source);
    if src.is_dir() {
        copy_dir_recursive(src, Path::new(&destination))
    } else {
        fs::copy(source, destination).map(|_| ()).map_err(|e| e.to_string())
    }
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        if file_type.is_dir() {
            copy_dir_recursive(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.join(entry.file_name())).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn get_home_dir() -> Result<String, String> {
    std::env::var("HOME").map_err(|_| "Could not find home directory".to_string())
}

// ── File Info ──────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug)]
pub struct FileInfo {
    name: String,
    path: String,
    is_dir: bool,
    size: u64,
    modified: u64,
    created: u64,
    permissions: String,
    is_symlink: bool,
    symlink_target: Option<String>,
    extension: Option<String>,
    mime_type: String,
}

#[tauri::command]
fn get_file_info(path: String) -> Result<FileInfo, String> {
    let p = Path::new(&path);
    let meta = fs::symlink_metadata(p).map_err(|e| e.to_string())?;
    
    let name = p.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
    
    let modified = meta.modified()
        .map(|t| t.duration_since(UNIX_EPOCH).unwrap_or_default().as_secs())
        .unwrap_or(0);
    
    let created = meta.created()
        .map(|t| t.duration_since(UNIX_EPOCH).unwrap_or_default().as_secs())
        .unwrap_or(0);

    let permissions = format!("{:o}", meta.permissions().mode() & 0o777);

    let is_symlink = meta.is_symlink();
    let symlink_target = if is_symlink {
        fs::read_link(p).ok().and_then(|t| t.to_str().map(|s| s.to_string()))
    } else {
        None
    };

    let extension = p.extension().and_then(|e| e.to_str()).map(|s| s.to_string());
    
    let mime_type = match extension.as_deref() {
        Some("txt" | "md" | "log") => "text/plain",
        Some("html" | "htm") => "text/html",
        Some("css") => "text/css",
        Some("js" | "ts" | "jsx" | "tsx") => "text/javascript",
        Some("json") => "application/json",
        Some("xml") => "application/xml",
        Some("pdf") => "application/pdf",
        Some("zip" | "gz" | "tar") => "application/archive",
        Some("png") => "image/png",
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("svg") => "image/svg+xml",
        Some("mp3" | "wav" | "flac") => "audio/*",
        Some("mp4" | "mov" | "avi") => "video/*",
        Some("rs") => "text/x-rust",
        Some("py") => "text/x-python",
        Some("rb") => "text/x-ruby",
        Some("go") => "text/x-go",
        Some("php") => "text/x-php",
        _ if meta.is_dir() => "inode/directory",
        _ => "application/octet-stream",
    }.to_string();

    Ok(FileInfo {
        name,
        path: path.clone(),
        is_dir: meta.is_dir(),
        size: meta.len(),
        modified,
        created,
        permissions,
        is_symlink,
        symlink_target,
        extension,
        mime_type,
    })
}

// ── FTP Commands ────────────────────────────────────────

use suppaftp::FtpStream;
use std::sync::Mutex;

static FTP_CONNECTION: std::sync::LazyLock<Mutex<Option<FtpStream>>> = 
    std::sync::LazyLock::new(|| Mutex::new(None));

#[tauri::command]
fn ftp_connect(host: String, port: u16, username: String, password: String) -> Result<String, String> {
    let addr = format!("{}:{}", host, port);
    let mut ftp = FtpStream::connect(&addr).map_err(|e| format!("Connection failed: {}", e))?;
    ftp.login(&username, &password).map_err(|e| format!("Login failed: {}", e))?;
    
    let pwd = ftp.pwd().unwrap_or_else(|_| "/".to_string());
    
    let mut conn = FTP_CONNECTION.lock().map_err(|e| e.to_string())?;
    *conn = Some(ftp);
    
    Ok(pwd)
}

#[tauri::command]
fn ftp_list(path: String) -> Result<Vec<FileEntry>, String> {
    let mut conn = FTP_CONNECTION.lock().map_err(|e| e.to_string())?;
    let ftp = conn.as_mut().ok_or("Not connected to FTP")?;
    
    ftp.cwd(&path).map_err(|e| format!("Cannot cd to {}: {}", path, e))?;
    
    let list = ftp.nlst(None).map_err(|e| format!("List failed: {}", e))?;
    
    let mut entries: Vec<FileEntry> = list.iter()
        .filter(|name| !name.is_empty() && *name != "." && *name != "..")
        .map(|name| {
            let full_path = if path == "/" {
                format!("/{}", name)
            } else {
                format!("{}/{}", path, name)
            };
            // Try to determine if it's a directory by attempting cwd
            let is_dir = ftp.cwd(&full_path).is_ok();
            if is_dir {
                let _ = ftp.cwd(&path);
            }
            
            FileEntry {
                name: name.clone(),
                path: full_path,
                is_dir,
                size: 0,
                modified: 0,
                extension: Path::new(name).extension().and_then(|e| e.to_str()).map(|s| s.to_string()),
            }
        })
        .collect();
    
    entries.sort_by(|a, b| {
        if a.is_dir != b.is_dir {
            b.is_dir.cmp(&a.is_dir)
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });
    
    Ok(entries)
}

#[tauri::command]
fn ftp_download(remote_path: String, local_path: String) -> Result<(), String> {
    let mut conn = FTP_CONNECTION.lock().map_err(|e| e.to_string())?;
    let ftp = conn.as_mut().ok_or("Not connected to FTP")?;
    
    let cursor = ftp.retr_as_buffer(&remote_path)
        .map_err(|e| format!("Download failed: {}", e))?;
    
    fs::write(&local_path, cursor.into_inner()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn ftp_upload(local_path: String, remote_path: String) -> Result<(), String> {
    let mut conn = FTP_CONNECTION.lock().map_err(|e| e.to_string())?;
    let ftp = conn.as_mut().ok_or("Not connected to FTP")?;
    
    let data = fs::read(&local_path).map_err(|e| e.to_string())?;
    let mut reader = std::io::Cursor::new(data);
    
    ftp.put_file(&remote_path, &mut reader)
        .map_err(|e| format!("Upload failed: {}", e))?;
    Ok(())
}

#[tauri::command]
fn ftp_disconnect() -> Result<(), String> {
    let mut conn = FTP_CONNECTION.lock().map_err(|e| e.to_string())?;
    if let Some(mut ftp) = conn.take() {
        let _ = ftp.quit();
    }
    Ok(())
}

#[tauri::command]
fn ftp_pwd() -> Result<String, String> {
    let mut conn = FTP_CONNECTION.lock().map_err(|e| e.to_string())?;
    let ftp = conn.as_mut().ok_or("Not connected to FTP")?;
    ftp.pwd().map_err(|e| e.to_string())
}

#[tauri::command]
fn ftp_mkdir(path: String) -> Result<(), String> {
    let mut conn = FTP_CONNECTION.lock().map_err(|e| e.to_string())?;
    let ftp = conn.as_mut().ok_or("Not connected to FTP")?;
    ftp.mkdir(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn ftp_delete(path: String) -> Result<(), String> {
    let mut conn = FTP_CONNECTION.lock().map_err(|e| e.to_string())?;
    let ftp = conn.as_mut().ok_or("Not connected to FTP")?;
    // Try to remove as file first, then as directory
    if ftp.rmdir(&path).is_err() {
        ftp.rm(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn ftp_rename(source: String, destination: String) -> Result<(), String> {
    let mut conn = FTP_CONNECTION.lock().map_err(|e| e.to_string())?;
    let ftp = conn.as_mut().ok_or("Not connected to FTP")?;
    ftp.rename(&source, &destination).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_directory,
            create_directory,
            delete_item,
            move_item,
            copy_item,
            get_home_dir,
            open_with_default_app,
            open_with_editor,
            open_with_app,
            reveal_in_finder,
            open_in_terminal,
            get_quick_paths,
            get_file_info,
            ftp_connect,
            ftp_list,
            ftp_download,
            ftp_upload,
            ftp_disconnect,
            ftp_pwd,
            ftp_mkdir,
            ftp_delete,
            ftp_rename
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
