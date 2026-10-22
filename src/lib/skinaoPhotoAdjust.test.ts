import { describe, expect, it } from "vitest";
import {
  adjustedImageStyle, DEFAULT_PHOTO_ADJUSTMENTS, normalizeAdjustments,
} from "./skinaoPhotoAdjust";

describe("non-destructive photo adjustments", () => {
  it("uses a centered original frame when no edits exist", () => {
    expect(normalizeAdjustments()).toEqual(DEFAULT_PHOTO_ADJUSTMENTS);
    const style = adjustedImageStyle();
    expect(style.objectPosition).toBe("50% 50%");
    expect(style.transform).toContain("rotate(0deg) scale(1)");
  });
  it("clamps invalid crop data to the supported limits", () => {
    expect(normalizeAdjustments({
      crop_x: -100, crop_y: 120, crop_zoom: 700, crop_rotation: 45,
    })).toEqual({ crop_x: 0, crop_y: 100, crop_zoom: 250, crop_rotation: 0 });
  });
  it("keeps rotation and zoom in shared display styles", () => {
    const style = adjustedImageStyle({
      crop_x: 65, crop_y: 40, crop_zoom: 135, crop_rotation: 90,
    });
    expect(style.objectPosition).toBe("65% 40%");
    expect(style.transform).toContain("rotate(90deg)");
    expect(style.transform).toContain("scale(2.3625)");
  });
});
