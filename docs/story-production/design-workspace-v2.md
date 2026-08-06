# MediaOS Feature 041 — Design Workspace V2 (Phase 1)

**Branch:** `feature/design-workspace-v2`  
**Scope:** Editing workspace quality only  
**Status:** Phase 1 implemented

---

## Objective

Turn Scene Composer from a preview window into a professional broadcast graphics editor workflow (speed, reliability, clean architecture) — without cloning AE / Fusion / Vizrt / XPression.

**Do not modify:** AI Producer · Timeline redesign · Renderer · Story Editor · Shape Engine · Behaviour Engine · Bindings · Motion Library.

---

## Layout (single workspace)

```
Menu Bar
Toolbar (canvas chips + zoom)
--------------------------------
Layer Tree  |  Canvas  |  Inspector
--------------------------------
Timeline (unchanged panel)
```

Panels remain resizable with persisted widths (`ResizablePanel` storage keys).

---

## Editor Command System

Every object mutation goes through named commands:

| Command | Purpose |
|---------|---------|
| `move_layer` / `resize_layer` / `rotate_layer` / `transform_layer` | Gizmo commits |
| `delete_layers` | Delete (+ descendants) |
| `duplicate_layers` / `paste_layers` | Copy / paste |
| `rename_layer` | Layer rename |
| `reorder_layers` | Drag reorder |
| `group_layers` / `ungroup_layers` | Hierarchy |
| `nudge_layers` | Arrow keys |
| `align_layers` | Align tools |
| `update_object` / `set_objects` | Inspector / bulk |

**Modules**

- `src/features/scene-composer/lib/editor-commands/`
- `src/features/scene-composer/hooks/use-editor-commands.ts`
- `src/features/scene-composer/hooks/use-editor-hotkeys.ts`

Live drag uses silent updates; pointer-up commits one undo entry.

---

## Canvas (Phase 1)

- Infinite workspace feel · Zoom 10%–300% · Pan (Space / middle / Alt)
- Mouse wheel zoom · Ctrl/Cmd + wheel precise zoom
- Fit · 100% · 200%
- Safe area · Guides · Grid · Rulers · Snap
- **Smart alignment guides** (sibling + artboard midlines)
- **Box / marquee selection** on empty artboard
- Multi-select (Ctrl/Shift) from canvas + layers
- Transform gizmo: bbox · resize · rotate · **anchor marker** · live updates

---

## Keyboard

| Shortcut | Action |
|----------|--------|
| Delete / Backspace | Delete selection |
| Ctrl/Cmd+C / V / D | Copy / Paste / Duplicate |
| Ctrl/Cmd+Z · Shift+Z · Y | Undo / Redo |
| Ctrl/Cmd+S | Save checkpoint |
| Ctrl/Cmd+A | Select all |
| Ctrl/Cmd+G · Shift+G | Group / Ungroup |
| Arrows · Shift+Arrows | Nudge 1px / 10px |
| Space | Pan mode |

---

## Layers

Hierarchical tree · drag reorder · groups · hide/lock/rename/duplicate/delete · **context menu** · Shift multi-select.

Selecting a layer seeks the timeline playhead to the layer `start_ms`.

---

## Success criteria (Phase 1)

- Editor feels like a graphics app before new tools/effects
- Mutations go through the command system
- Canvas stays interactive (live drag silent, commit on release)
- Timeline panel unchanged; selection stays linked

---

## Next (not Phase 1)

- Coalesced typing undo for rename / inspector
- Multi-object transform gizmo (shared handles)
- Virtualized layer list for 200+ layers
- Draggable anchor / pivot editing
- OS clipboard HTML/SVG interchange
