/** Normalized crop coordinates are relative to the ORIGINAL image, not a displayed thumbnail. */
export type CropRect = { x: number; y: number; width: number; height: number };
export type CropHandle = "nw" | "ne" | "sw" | "se";
export type CropRatio = "card" | "mobile" | "free";

const LIMIT = 0.08;
export const cropAspect = (ratio: CropRatio): number | null =>
  ratio === "card" ? 1.55 : ratio === "mobile" ? 1.38 : null;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function initialCrop(width: number, height: number, ratio: CropRatio): CropRect {
  if (width <= 0 || height <= 0) throw new Error("Dimensões inválidas para o recorte.");
  const aspect = cropAspect(ratio);
  if (aspect === null) return { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
  // Leave 8% margins and preserve the requested physical pixel aspect ratio.
  const widthScale = Math.min(0.84, (0.84 * height * aspect) / width);
  const heightScale = widthScale * width / (height * aspect);
  return {
    x: (1 - widthScale) / 2, y: (1 - heightScale) / 2,
    width: widthScale, height: heightScale,
  };
}

export function moveCrop(rect: CropRect, dx: number, dy: number): CropRect {
  return {
    ...rect,
    x: clamp(rect.x + dx, 0, 1 - rect.width),
    y: clamp(rect.y + dy, 0, 1 - rect.height),
  };
}

export function resizeCrop(
  rect: CropRect, handle: CropHandle, dx: number, dy: number,
  imageWidth: number, imageHeight: number, ratio: CropRatio,
): CropRect {
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  const sx = handle.endsWith("e") ? 1 : -1;
  const sy = handle.startsWith("s") ? 1 : -1;
  const anchorX = sx === 1 ? rect.x : right;
  const anchorY = sy === 1 ? rect.y : bottom;
  const maxW = sx === 1 ? 1 - anchorX : anchorX;
  const maxH = sy === 1 ? 1 - anchorY : anchorY;
  const requestedW = rect.width + dx * sx;
  const requestedH = rect.height + dy * sy;
  const aspect = cropAspect(ratio);
  let newW: number, newH: number;
  if (aspect === null) {
    newW = clamp(requestedW, Math.min(LIMIT, maxW), maxW);
    newH = clamp(requestedH, Math.min(LIMIT, maxH), maxH);
  } else {
    const fractionRatio = (aspect * imageHeight) / imageWidth;
    const widthFromHeight = requestedH * fractionRatio;
    // Use whichever movement is strongest, respecting the actual image aspect.
    const wantedWidth = Math.abs(requestedW - rect.width) >= Math.abs(widthFromHeight - rect.width)
      ? requestedW : widthFromHeight;
    const upper = Math.min(maxW, maxH * fractionRatio);
    newW = clamp(wantedWidth, Math.min(0.05, upper), upper);
    newH = newW / fractionRatio;
  }
  return {
    x: sx === 1 ? anchorX : anchorX - newW,
    y: sy === 1 ? anchorY : anchorY - newH,
    width: newW, height: newH,
  };
}

/** Pixel bounds for canvas; clamp rounding to never read outside source pixels. */
export function cropPixels(rect: CropRect, width: number, height: number) {
  const sx = clamp(Math.round(rect.x * width), 0, width - 1);
  const sy = clamp(Math.round(rect.y * height), 0, height - 1);
  const sw = clamp(Math.round(rect.width * width), 1, width - sx);
  const sh = clamp(Math.round(rect.height * height), 1, height - sy);
  return { sx, sy, sw, sh };
}
