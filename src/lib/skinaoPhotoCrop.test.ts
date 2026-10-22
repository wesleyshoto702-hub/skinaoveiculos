import { describe, expect, it } from "vitest";
import { cropPixels, initialCrop, moveCrop, resizeCrop } from "./skinaoPhotoCrop";

describe("non-destructive cropping geometry", () => {
  it("keeps desktop crop at the correct pixel aspect ratio", () => {
    const rect = initialCrop(1600, 900, "card");
    const pixels = cropPixels(rect, 1600, 900);
    expect(pixels.sw / pixels.sh).toBeCloseTo(1.55, 2);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
  });

  it("supports portrait originals for a mobile catalog crop", () => {
    const rect = initialCrop(900, 1600, "mobile");
    const pixels = cropPixels(rect, 900, 1600);
    expect(pixels.sw / pixels.sh).toBeCloseTo(1.38, 2);
    expect(rect.x + rect.width).toBeLessThanOrEqual(1);
  });

  it("supports free crop independently of the image ratio", () => {
    expect(initialCrop(1000, 500, "free")).toEqual({
      x: 0.1, y: 0.1, width: 0.8, height: 0.8,
    });
  });

  it("clamps dragging inside the original image", () => {
    const crop = { x: 0.2, y: 0.2, width: 0.5, height: 0.5 };
    expect(moveCrop(crop, 50, -50)).toEqual({
      x: 0.5, y: 0, width: 0.5, height: 0.5,
    });
  });

  it("resizes a fixed-ratio selection from the bottom right", () => {
    const crop = initialCrop(1600, 900, "card");
    const smaller = resizeCrop(crop, "se", -0.13, -0.07, 1600, 900, "card");
    expect(smaller.width).toBeLessThan(crop.width);
    expect((smaller.width * 1600) / (smaller.height * 900)).toBeCloseTo(1.55, 6);
    expect(smaller.x).toBeCloseTo(crop.x, 8);
    expect(smaller.y).toBeCloseTo(crop.y, 8);
  });

  it("resizes free crop from the top left keeping its opposite corner fixed", () => {
    const crop = { x: 0.1, y: 0.2, width: 0.7, height: 0.6 };
    const smaller = resizeCrop(crop, "nw", 0.1, 0.1, 1600, 900, "free");
    expect(smaller.x + smaller.width).toBeCloseTo(0.8, 8);
    expect(smaller.y + smaller.height).toBeCloseTo(0.8, 8);
  });

  it("converts a crop to valid integer source pixels", () => {
    const pixels = cropPixels({ x: 0.96, y: 0.96, width: 0.2, height: 0.2 }, 200, 100);
    expect(pixels.sx + pixels.sw).toBeLessThanOrEqual(200);
    expect(pixels.sy + pixels.sh).toBeLessThanOrEqual(100);
    expect(pixels.sw).toBeGreaterThan(0);
  });
});
