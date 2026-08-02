# Module 4.3 — Edge Sweep Behavior

Reusable perimeter highlight for Scene Composer objects. Independent of entrance/idle/exit motion and of the Broadcast Effects stack.

## Architecture

```
src/features/scene-composer/lib/edge-sweep/
  types.ts      – config, loop modes, styles
  defaults.ts   – defaults + built-in presets
  apply.ts      – read/write metadata.behaviors.edge_sweep
  index.ts

src/features/scene-composer/components/editor/
  edge-sweep-overlay.tsx   – SVG stroke-dashoffset renderer
  layer-behaviors-panel.tsx – Behaviors tab UI
```

Config is stored on the object:

```json
{
  "metadata": {
    "behaviors": {
      "version": 1,
      "edge_sweep": { "enabled": true, "style": "broadcast_blue", "..." : "..." }
    }
  }
}
```

## Rendering

- SVG `rect` with `rx`/`ry` matching object corner radius
- Animation via `stroke-dashoffset` + `requestAnimationFrame` (GPU-compositor friendly)
- Soft trail + mild glow; blend mode configurable
- Loop modes: continuous, once, on hover, on scene start

## Inspector

**Behaviors** tab (next to Effects):

- Enable / Disable
- Preview
- Duplicate settings
- Apply / Save as Preset
- All customization fields (color, width, length, speed, direction, trail, etc.)

## Built-in presets

| Preset | Intent |
|--------|--------|
| Broadcast Blue | Video frame (demo on Main Video) |
| Premium White | Lower third / panels (demo on Lower Info Panel) |
| Breaking Red | Urgent dual highlights |
| Gold Premium | Gold accent |
| Glass Reflection | Metallic rim |
| Live Pulse Sweep | Four-corner chase |

## Demo layers (GNN-001 v21)

- **Main Video Container** → Broadcast Blue
- **Lower Info Panel** → Premium White

Refreshing the GNN-001 skeleton (`gnn-001-skeleton-v21`) applies demos without changing other animation systems.
