import type {
  ShapeComposerConfig,
  ShapeCornerRadii,
  ShapePath,
} from "@/features/scene-composer/lib/shape-composer/types";

/** Build an SVG path `d` for the procedural shape inside a w×h box. */
export function buildShapePathD(
  config: ShapeComposerConfig,
  width: number,
  height: number,
): string {
  const w = Math.max(1, width);
  const h = Math.max(1, height);

  switch (config.kind) {
    case "circle":
      return ellipsePath(w / 2, h / 2, Math.min(w, h) / 2, Math.min(w, h) / 2);
    case "ellipse":
      return ellipsePath(w / 2, h / 2, w / 2, h / 2);
    case "line":
    case "divider_line":
      return `M 0 ${h / 2} L ${w} ${h / 2}`;
    case "arrow":
      return arrowPath(w, h, config.arrowHeadSize);
    case "triangle":
      return polygonPath(w, h, 3, -Math.PI / 2);
    case "polygon":
      return polygonPath(w, h, Math.max(3, config.sides), -Math.PI / 2);
    case "star":
      return starPath(w, h, Math.max(3, config.starPoints), config.starInnerRadius);
    case "ribbon":
      return ribbonPath(w, h);
    case "speech_bubble":
      return speechBubblePath(w, h, config.cornerRadii);
    case "corner_accent":
      return cornerAccentPath(w, h);
    case "svg_path":
    case "custom_path":
      return pathFromPoints(config.path, w, h);
    case "rounded_rectangle":
    case "glass_panel":
    case "gradient_panel":
    case "border_frame":
    case "ticker_bar":
    case "headline_bar":
    case "reporter_card":
    case "video_frame":
    case "image_mask":
    case "video_mask":
    case "rectangle":
    default:
      return roundedRectPath(w, h, resolveRadii(config, w, h));
  }
}

export function resolveRadii(
  config: ShapeComposerConfig,
  width: number,
  height: number,
): ShapeCornerRadii {
  const maxR = Math.min(width, height) / 2;
  if (config.uniformCorners) {
    const r = Math.min(maxR, Math.max(0, config.cornerRadii.topLeft || config.radius));
    return { topLeft: r, topRight: r, bottomRight: r, bottomLeft: r };
  }
  return {
    topLeft: Math.min(maxR, Math.max(0, config.cornerRadii.topLeft)),
    topRight: Math.min(maxR, Math.max(0, config.cornerRadii.topRight)),
    bottomRight: Math.min(maxR, Math.max(0, config.cornerRadii.bottomRight)),
    bottomLeft: Math.min(maxR, Math.max(0, config.cornerRadii.bottomLeft)),
  };
}

export function roundedRectPath(
  w: number,
  h: number,
  r: ShapeCornerRadii,
): string {
  const tl = r.topLeft;
  const tr = r.topRight;
  const br = r.bottomRight;
  const bl = r.bottomLeft;
  return [
    `M ${tl} 0`,
    `H ${w - tr}`,
    tr > 0 ? `A ${tr} ${tr} 0 0 1 ${w} ${tr}` : `L ${w} 0`,
    `V ${h - br}`,
    br > 0 ? `A ${br} ${br} 0 0 1 ${w - br} ${h}` : `L ${w} ${h}`,
    `H ${bl}`,
    bl > 0 ? `A ${bl} ${bl} 0 0 1 0 ${h - bl}` : `L 0 ${h}`,
    `V ${tl}`,
    tl > 0 ? `A ${tl} ${tl} 0 0 1 ${tl} 0` : `L 0 0`,
    "Z",
  ].join(" ");
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return [
    `M ${cx - rx} ${cy}`,
    `A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy}`,
    `A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy}`,
    "Z",
  ].join(" ");
}

function polygonPath(w: number, h: number, sides: number, rotation: number): string {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i * 2 * Math.PI) / sides;
    const cmd = i === 0 ? "M" : "L";
    pts.push(`${cmd} ${cx + Math.cos(a) * rx} ${cy + Math.sin(a) * ry}`);
  }
  pts.push("Z");
  return pts.join(" ");
}

function starPath(
  w: number,
  h: number,
  points: number,
  inner: number,
): string {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const pts: string[] = [];
  const count = points * 2;
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const f = i % 2 === 0 ? 1 : Math.min(0.95, Math.max(0.1, inner));
    const cmd = i === 0 ? "M" : "L";
    pts.push(`${cmd} ${cx + Math.cos(a) * rx * f} ${cy + Math.sin(a) * ry * f}`);
  }
  pts.push("Z");
  return pts.join(" ");
}

function arrowPath(w: number, h: number, head: number): string {
  const ah = Math.min(0.45, Math.max(0.08, head));
  const mid = h / 2;
  const shaft = h * 0.22;
  const headW = w * ah;
  return [
    `M 0 ${mid - shaft}`,
    `H ${w - headW}`,
    `L ${w - headW} ${h * 0.12}`,
    `L ${w} ${mid}`,
    `L ${w - headW} ${h * 0.88}`,
    `L ${w - headW} ${mid + shaft}`,
    `H 0`,
    "Z",
  ].join(" ");
}

function ribbonPath(w: number, h: number): string {
  const notch = Math.min(w * 0.12, h * 0.45);
  return [
    `M 0 0`,
    `H ${w}`,
    `L ${w - notch} ${h / 2}`,
    `L ${w} ${h}`,
    `H 0`,
    `L ${notch} ${h / 2}`,
    "Z",
  ].join(" ");
}

function speechBubblePath(w: number, h: number, r: ShapeCornerRadii): string {
  const tail = Math.min(w * 0.18, 36);
  const bodyH = h - tail * 0.7;
  const body = roundedRectPath(w, bodyH, {
    topLeft: Math.min(r.topLeft, 16),
    topRight: Math.min(r.topRight, 16),
    bottomRight: Math.min(r.bottomRight, 16),
    bottomLeft: Math.min(r.bottomLeft, 16),
  });
  const tipX = w * 0.22;
  return `${body} M ${tipX} ${bodyH} L ${tipX - tail * 0.35} ${h} L ${tipX + tail * 0.55} ${bodyH} Z`;
}

function cornerAccentPath(w: number, h: number): string {
  const t = Math.min(w, h) * 0.22;
  return `M 0 0 H ${w} V ${t} H ${t} V ${h} H 0 Z`;
}

export function pathFromPoints(path: ShapePath, w: number, h: number): string {
  if (path.points.length === 0) return "";
  const parts: string[] = [];
  path.points.forEach((pt, i) => {
    const x = pt.x * w;
    const y = pt.y * h;
    if (i === 0) {
      parts.push(`M ${x} ${y}`);
      return;
    }
    const prev = path.points[i - 1];
    const c1x = (prev.x + prev.handleOutX) * w;
    const c1y = (prev.y + prev.handleOutY) * h;
    const c2x = (pt.x + pt.handleInX) * w;
    const c2y = (pt.y + pt.handleInY) * h;
    if (
      prev.handleOutX === 0 &&
      prev.handleOutY === 0 &&
      pt.handleInX === 0 &&
      pt.handleInY === 0
    ) {
      parts.push(`L ${x} ${y}`);
    } else {
      parts.push(`C ${c1x} ${c1y} ${c2x} ${c2y} ${x} ${y}`);
    }
  });
  if (path.closed && path.points.length > 2) {
    const first = path.points[0];
    const last = path.points[path.points.length - 1];
    const c1x = (last.x + last.handleOutX) * w;
    const c1y = (last.y + last.handleOutY) * h;
    const c2x = (first.x + first.handleInX) * w;
    const c2y = (first.y + first.handleInY) * h;
    if (
      last.handleOutX === 0 &&
      last.handleOutY === 0 &&
      first.handleInX === 0 &&
      first.handleInY === 0
    ) {
      parts.push("Z");
    } else {
      parts.push(
        `C ${c1x} ${c1y} ${c2x} ${c2y} ${first.x * w} ${first.y * h} Z`,
      );
    }
  }
  return parts.join(" ");
}

export function gradientCss(config: ShapeComposerConfig): string {
  const g = config.gradient;
  const stops = g.stops
    .map((s) => `${s.color} ${Math.round(s.offset * 100)}%`)
    .join(", ");
  if (g.type === "radial") {
    return `radial-gradient(circle at 50% 50%, ${stops})`;
  }
  return `linear-gradient(${g.angle}deg, ${stops})`;
}
