import { normalizeAdjustments, type PhotoAdjustments } from "./skinaoPhotoAdjust";

export type PhotoPoint = { x: number; y: number };

/** Drag distances are measured from the gesture start, so slow movements are not lost to rounding. */
export function panPhoto(
  start: PhotoAdjustments, dx: number, dy: number, width: number, height: number,
): PhotoAdjustments {
  return normalizeAdjustments({
    ...start,
    crop_x: start.crop_x + (dx / Math.max(1, width)) * 160,
    crop_y: start.crop_y + (dy / Math.max(1, height)) * 160,
  });
}

export function zoomPhoto(start: PhotoAdjustments, factor: number): PhotoAdjustments {
  if (!Number.isFinite(factor) || factor <= 0) return normalizeAdjustments(start);
  return normalizeAdjustments({ ...start, crop_zoom: start.crop_zoom * factor });
}

export function pointerDistance(a: PhotoPoint, b: PhotoPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pointerCenter(a: PhotoPoint, b: PhotoPoint): PhotoPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Normalize wheel lines/pages to pixels for consistent mouse wheel and trackpad zoom. */
export function wheelZoomFactor(deltaY: number, deltaMode: number, pageHeight: number): number {
  const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? pageHeight : 1);
  return Math.exp(-Math.max(-500, Math.min(500, pixels)) * 0.0025);
}
