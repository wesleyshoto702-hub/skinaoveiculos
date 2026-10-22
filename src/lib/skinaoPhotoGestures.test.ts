import { describe, expect, it } from "vitest";
import { panPhoto, pointerCenter, pointerDistance, wheelZoomFactor, zoomPhoto } from "./skinaoPhotoGestures";
import { DEFAULT_PHOTO_ADJUSTMENTS } from "./skinaoPhotoAdjust";

describe("direct manipulation of vehicle photographs", () => {
  it("moves an image horizontally and vertically relative to the original gesture origin", () => {
    const moved = panPhoto(DEFAULT_PHOTO_ADJUSTMENTS, 75, -30, 300, 200);
    expect(moved.crop_x).toBe(90);
    expect(moved.crop_y).toBe(26);
  });

  it("clamps dragging to the permitted crop range", () => {
    const moved = panPhoto(DEFAULT_PHOTO_ADJUSTMENTS, 900, -900, 300, 200);
    expect(moved.crop_x).toBe(100);
    expect(moved.crop_y).toBe(0);
  });

  it("clamps wheel and pinch zoom while leaving rotation/position unchanged", () => {
    const start = { ...DEFAULT_PHOTO_ADJUSTMENTS, crop_x: 30, crop_rotation: 90 };
    const zoomed = zoomPhoto(start, 1.5);
    expect(zoomed.crop_zoom).toBe(150);
    expect(zoomed.crop_x).toBe(30);
    expect(zoomed.crop_rotation).toBe(90);
    expect(zoomPhoto(zoomed, 100).crop_zoom).toBe(250);
    expect(zoomPhoto(zoomed, 0.01).crop_zoom).toBe(100);
  });

  it("computes two-finger center and separation", () => {
    expect(pointerCenter({x: 10, y: 30}, {x: 30, y: 10})).toEqual({x:20,y:20});
    expect(pointerDistance({x:0,y:0}, {x:30,y:40})).toBe(50);
  });

  it("zooms in when scrolling up and out when scrolling down", () => {
    expect(wheelZoomFactor(-100,0,500)).toBeGreaterThan(1);
    expect(wheelZoomFactor(100,0,500)).toBeLessThan(1);
    expect(wheelZoomFactor(-1,1,500)).toBeGreaterThan(1);
  });

  it("ignores invalid zoom multipliers", () => {
    expect(zoomPhoto(DEFAULT_PHOTO_ADJUSTMENTS, Number.NaN)).toEqual(DEFAULT_PHOTO_ADJUSTMENTS);
    expect(zoomPhoto(DEFAULT_PHOTO_ADJUSTMENTS, 0)).toEqual(DEFAULT_PHOTO_ADJUSTMENTS);
  });
});
