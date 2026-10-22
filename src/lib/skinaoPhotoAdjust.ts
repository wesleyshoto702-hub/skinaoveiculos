import type { CSSProperties } from "react";

/** Non-destructive photo adjustments; the original file is never overwritten. */
export type PhotoAdjustments = {
  crop_x: number; crop_y: number; crop_zoom: number; crop_rotation: number;
};
export const DEFAULT_PHOTO_ADJUSTMENTS: PhotoAdjustments = {
  crop_x: 50, crop_y: 50, crop_zoom: 100, crop_rotation: 0,
};
export function normalizeAdjustments(value?: Partial<PhotoAdjustments> | null): PhotoAdjustments {
  const clamp = (number: number | undefined, min: number, max: number, fallback: number) =>
    Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number!))) : fallback;
  const rotation = Number(value?.crop_rotation);
  return {
    crop_x: clamp(value?.crop_x, 0, 100, 50),
    crop_y: clamp(value?.crop_y, 0, 100, 50),
    crop_zoom: clamp(value?.crop_zoom, 100, 250, 100),
    crop_rotation: [0, 90, 180, 270].includes(rotation) ? rotation : 0,
  };
}

/** Shared by editor, admin thumbnails, public cards and vehicle gallery. */
export function adjustedImageStyle(value?: Partial<PhotoAdjustments> | null): CSSProperties {
  const edit = normalizeAdjustments(value);
  // 90º rotation needs extra cover scale for landscape frames, including mobile.
  const rotationFill = edit.crop_rotation % 180 !== 0 ? 1.75 : 1;
  const scale = (edit.crop_zoom / 100) * rotationFill;
  const movement = Math.min(35, Math.max(0, (scale - 1) * 50));
  const dx = ((edit.crop_x - 50) / 50) * movement;
  const dy = ((edit.crop_y - 50) / 50) * movement;
  return {
    objectFit: "cover", objectPosition: `${edit.crop_x}% ${edit.crop_y}%`,
    transform: `translate(${dx}%, ${dy}%) rotate(${edit.crop_rotation}deg) scale(${scale})`,
    transition: "transform 160ms ease-out, object-position 160ms ease-out",
  };
}
