import { describe, expect, test } from "bun:test";
import { formatClientDisplaySize, formatDevicePixelRatio, getClientDisplaySizeParts } from "./client-display-size";

const chineseTemplate = "{{screen}} @{{dpr}}x（窗口 {{windowSize}}）";
const englishTemplate = "{{screen}} @{{dpr}}x (window {{windowSize}})";

describe("client display size formatting", () => {
  test("exposes interpolation parts for localized system info", () => {
    expect(getClientDisplaySizeParts({
      devicePixelRatio: 2,
      screenHeight: 982,
      screenWidth: 1512,
      windowHeight: 800,
      windowWidth: 1280,
    })).toEqual({
      dpr: "2",
      screen: "1512×982",
      windowSize: "1280×800",
    });
  });

  test("formats screen size, device pixel ratio, and window size", () => {
    expect(formatClientDisplaySize({
      devicePixelRatio: 2,
      screenHeight: 982,
      screenWidth: 1512,
      windowHeight: 800,
      windowWidth: 1280,
    }, chineseTemplate)).toBe("1512×982 @2x（窗口 1280×800）");
    expect(formatClientDisplaySize({
      devicePixelRatio: 1.25,
      screenHeight: 1080,
      screenWidth: 1920,
      windowHeight: 900,
      windowWidth: 1440,
    }, englishTemplate)).toBe("1920×1080 @1.25x (window 1440×900)");
  });

  test("rounds css pixels and trims integer device pixel ratios", () => {
    expect(formatDevicePixelRatio(2)).toBe("2");
    expect(formatDevicePixelRatio(1.5)).toBe("1.5");
    expect(formatDevicePixelRatio(1.333333)).toBe("1.33");
    expect(formatClientDisplaySize({
      devicePixelRatio: 2.0000001,
      screenHeight: 981.4,
      screenWidth: 1511.6,
      windowHeight: 799.6,
      windowWidth: 1279.4,
    }, chineseTemplate)).toBe("1512×981 @2x（窗口 1279×800）");
  });

  test("returns null when a display metric is missing", () => {
    expect(formatClientDisplaySize({
      devicePixelRatio: 2,
      screenHeight: 982,
      screenWidth: 0,
      windowHeight: 800,
      windowWidth: 1280,
    }, chineseTemplate)).toBeNull();
    expect(formatDevicePixelRatio(0)).toBeNull();
    expect(formatDevicePixelRatio(Number.NaN)).toBeNull();
  });
});
