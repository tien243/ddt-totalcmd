# MEMORY.md — DDT Commander

> Sổ kinh điển dự án. Chỉ chứa tinh hoa, quy tắc bất biến.

## 🏗 Kiến trúc

- **Stack**: Tauri v2 (Rust 1.95) + React 19 + TypeScript + Tailwind CSS v4 + Zustand
- **Pattern**: Thin Frontend — Thick Backend. I/O nặng xử lý bởi Rust, React chỉ render
- **State**: Zustand store (`useFileStore.ts`) quản lý dual-pane state (path, entries, cursor, selection, history)

## ⚠️ Gotchas & Quy tắc bất biến

### Tailwind CSS v4
- **BẮT BUỘC** có `@tailwindcss/vite` plugin trong `vite.config.ts`
- Chỉ `@import "tailwindcss"` trong CSS là KHÔNG ĐỦ — sẽ ra trắng trang
- KHÔNG cần `postcss.config.js` hay `tailwind.config.js` (v4 dùng CSS-first config)

### React 19 Compatibility
- `react-window` v1.x KHÔNG tương thích (peer dep React ≤18) → **CRASH**
- Luôn dùng `--legacy-peer-deps` khi `npm install`
- Dùng native scroll + `scrollIntoView()` thay vì virtual scrolling library

### Tauri v2 Plugins
- Mỗi plugin phải đăng ký **2 nơi**:
  1. Rust: `.plugin(tauri_plugin_xxx::init())` trong `lib.rs`
  2. Capabilities: Thêm `"xxx:default"` vào `src-tauri/capabilities/default.json`
- Nếu thiếu 1 trong 2 → silent failure hoặc permission denied

### CSS Mặc định Vite Template
- File `src/App.css` chứa styles cũ (light theme, centered layout) — **KHÔNG IMPORT**
- File `src/index.css` body KHÔNG được có `display: flex; place-items: center` — sẽ phá layout

## 📁 Cấu trúc dự án

```
ddt-totalcmd/
├── src-tauri/
│   ├── src/lib.rs          # Rust commands (list_directory, file ops, get_home_dir)
│   ├── Cargo.toml           # Dependencies: tauri, serde, tauri-plugin-dialog
│   └── capabilities/default.json  # Permissions
├── src/
│   ├── App.tsx              # Main layout + global keyboard handler
│   ├── main.tsx             # React entry point
│   ├── index.css            # Tailwind v4 import + base styles
│   ├── components/
│   │   ├── FilePane.tsx     # Dual-pane file list (native scroll)
│   │   └── ActionBar.tsx    # F3-F8 action buttons
│   └── store/
│       └── useFileStore.ts  # Zustand state management
├── vite.config.ts           # Vite + React + @tailwindcss/vite
├── PRD.md
├── IMPLEMENTATION_PLAN.md
├── TEST_PLAN.md
└── GEMINI.md
```

## 📋 Keyboard Shortcuts
| Key | Action |
|-----|--------|
| Tab | Switch active pane |
| ↑/↓ | Navigate files |
| Enter | Open directory |
| Backspace | Go to parent |
| Space | Toggle selection |
| F5 | Copy to other pane |
| F6 | Move to other pane |
| F7 | Create directory |
| F8/Delete | Delete selected |

## 📊 Tiến độ
- [x] Phase 1: Research & Design
- [x] Phase 2: Backend (Rust commands)
- [x] Phase 3: Frontend (UI components)
- [x] Phase 4: Integration (keyboard, file ops)
- [x] Phase 5: Testing (build pass, app runs)
- [x] Phase 7: Cross-protocol file operations (Copy/Move Local <-> FTP)
- [ ] Phase 8: Progress Bar & UI Polish

---
*Cập nhật lần cuối: 2026-05-03*
