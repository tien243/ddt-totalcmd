# Product Requirements Document: ddt-totalcmd

## 1. Product Overview
`ddt-totalcmd` is a high-performance, dual-pane file manager for macOS, inspired by the classic Total Commander.

## 2. Goals & Objectives
- **Speed**: Instant directory listing.
- **Keyboard-First**: Classic F-key shortcuts (F3-F8).
- **Dual Pane**: Classic side-by-side view.

## 4. Features & Requirements
- [x] **Dual-Pane Interface**: Side-by-side directory views.
- [x] **Navigation**: Navigate folders with Enter/Backspace/Arrow keys.
- [x] **File Operations**: F3 (View), F5 (Copy), F6 (Move), F7 (MkDir), F8 (Delete).
- [x] **Keyboard Shortcuts**: Tab to switch panes, Space to select.

## 8. Technical Architecture
- **Tech Stack**: Tauri v2 (Rust 1.95), React (TypeScript).
- **Virtualization**: `react-window`.
