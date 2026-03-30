# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Menu Maker is an Electron desktop app for creating professional print menus for bars and restaurants. Users design menus with a split-panel editor (left: settings, right: live preview) and export to PDF/PNG/JPEG.

## Tech Stack

- **Runtime:** Electron 40 + electron-vite 5
- **Frontend:** React 19 + TypeScript + Tailwind CSS v4
- **State:** Zustand v5 with zundo temporal middleware (undo/redo)
- **DnD:** @dnd-kit for drag-and-drop sortable sections/items
- **Fonts:** 30 Fontsource font families bundled
- **Colors:** react-colorful for color pickers
- **Testing:** Vitest + @testing-library/react + jsdom
- **Packaging:** electron-builder (DMG/NSIS)

## Commands

```bash
# IMPORTANT: Node v22.14.0 is at $HOME/.local/bin — always set PATH first
export PATH="$HOME/.local/bin:$PATH"

npm run dev          # Launch dev mode (electron-vite dev)
npm run build        # Build for production
npm run test         # Run all tests (vitest run)
npm run test:watch   # Watch mode
npm run typecheck    # TypeScript check (both node + web configs)
npm run package:mac  # Build DMG
npm run package:win  # Build NSIS installer
```

## Architecture

```
src/
├── main/           # Electron main process — IPC handlers for file I/O, PDF export, dialogs
├── preload/        # Context bridge exposing typed window.electronAPI
└── renderer/       # React app
    ├── models/     # TypeScript interfaces (menu.ts, layout.ts, project.ts, version.ts)
    ├── stores/     # Zustand stores (menu-store, layout-store, ui-store)
    ├── components/
    │   ├── editor/   # Left panel tabs: ContentTab, StyleTab, PageTab, LogoEditor
    │   ├── preview/  # PagePreview — live WYSIWYG canvas with zoom/drag/resize
    │   ├── layout/   # AppShell (main layout), DocumentTabBar
    │   └── onboarding/ # WelcomeWizard
    ├── hooks/      # useProjectManager, useExportPdf, useExportImage, useImportPdf, useImportImage, useUndoRedo, useKeyboardShortcuts, useDocumentTabs, useVersionHistory
    ├── templates/  # 13 built-in menu templates + style presets
    ├── fonts/      # Font registry and CSS loader
    ├── layout/     # Layout engines: auto-layout, tri-fold, measure, overflow, alignment
    └── utils/      # Shared utilities (parse-menu-text)
```

## Key Patterns

- **File format:** `.menu` files are gzipped JSON (MenuProject interface). Auto-save writes to `{path}.autosave` every 60s when dirty.
- **Cross-component communication:** Uses custom events (`window.dispatchEvent(new CustomEvent('menu-maker:...'))`) for menu bar → React coordination.
- **State architecture:** Three stores (menu, layout, UI) with temporal middleware on menu-store and layout-store for undo/redo.
- **Header system:** `pageLayout.headerConfig` with 6 presets (centered-stack, left-logo, right-logo, inline, minimal, custom). Legacy `headerHeight` field is deprecated.
- **Tri-fold support:** Letter-fold, z-fold, gate-fold types on letter/legal paper with 6 panels.
- **Preview rendering:** Inline styles in PagePreview.tsx for accurate print output (not Tailwind), since these styles must match PDF export exactly.

## Layout Engine Principles

- **Single source of truth:** `pageLayout.sectionLayouts` polygon data is what gets rendered. Never override positions at render time — if corrections are needed, write them back to the store.
- **No competing systems:** Avoid layering multiple systems that independently control the same property (e.g., position/height). When auto-layout estimates differ from actual DOM measurements, commit corrections to the store once, don't apply ephemeral overrides every render.
- **Drag/resize operate on truth:** User interactions (drag, resize) must read and write the same data that rendering uses. If rendering applies transforms the interaction code doesn't know about, positions will jump.
- **`useLayoutCommit`:** One-shot hook that measures DOM heights after auto-layout and writes corrected polygons back to the store (undo-invisible). Only runs when `pendingLayoutCommit` flag is set by auto-layout call sites.
- **Content clips, not expands:** Sections use `overflow: hidden`. If content is taller than its polygon box, it clips. User can resize or re-run auto-layout.

## Design System

- **Accent color:** Amber-700/600 throughout the app. Do NOT use blue for active/selected states (except template category pills which have per-category colors).
- **Button styles:** `px-3 py-1.5 text-xs font-medium rounded-md border` for action bar buttons.
- **Active toggle:** `bg-amber-50 text-amber-800 border-amber-600` for toggle buttons.
