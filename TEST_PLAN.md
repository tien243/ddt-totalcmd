# Test Plan: ddt-totalcmd

## 1. Unit Tests (Rust)
- [ ] `list_directory`: Verify it returns correct metadata and sorts directories first.
- [ ] `get_home_dir`: Verify it returns a valid path.
- [ ] `copy_item`: Test single file copy and recursive directory copy.

## 2. Integration Tests (Frontend + Backend)
- [ ] **Navigation Flow**:
    - [ ] Enter a folder (Enter).
    - [ ] Go back to parent (Backspace).
    - [ ] Change drive/root path.
- [ ] **Pane Interaction**:
    - [ ] Switch active pane using `Tab`.
    - [ ] Verify active pane styling (blue border).
- [ ] **File Operations**:
    - [ ] Select multiple files (Space).
    - [ ] Copy selected files from Left -> Right.
    - [ ] Move selected files from Right -> Left.
    - [ ] Delete a folder (F8).

## 3. UI/UX Verification
- [ ] **Performance**: Test with a folder containing >1000 items (check scrolling lag).
- [ ] **Responsive**: Check layout at different window sizes.
- [ ] **Shortcut Logic**: Ensure F-keys trigger correct dialogs/actions.

## 4. Edge Cases
- [ ] Accessing protected directories (Permission denied handling).
- [ ] Copying/Moving files to the same directory (Collision handling).
- [ ] Deleting an empty directory vs non-empty directory.

---

## Test Results
| Test Case | Status | Notes |
| --------- | ------ | ----- |
| Rust Compilation | PASS | Updated to Rust 1.95.0, compiles perfectly |
| Frontend Build | PASS | Vite build successful |
| Navigation | PENDING | User needs to verify in `npm run tauri dev` |
| File Operations | PENDING | F5, F6, F7, F8 wired up via window.confirm. User needs to verify. |

## 🚀 How to Run Local Tests
1. Open terminal in project root.
2. Run `npm install` (if not already done).
3. Run `npm run tauri dev`.
4. Verify the dual-pane interface and keyboard shortcuts (Arrows, Tab, Enter, F-keys).
