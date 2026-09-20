export type ClientDisplaySizeInput = {
  devicePixelRatio: number;
  screenHeight: number;
  screenWidth: number;
  windowHeight: number;
  windowWidth: number;
};

export type ClientDisplaySizeParts = {
  dpr: string;
  screen: string;
  windowSize: string;
};

const formatDisplayPixels = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return null;
  return String(Math.round(value));
};

export const formatDevicePixelRatio = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return null;
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

export const getClientDisplaySizeParts = (
  input: ClientDisplaySizeInput,
): ClientDisplaySizeParts | null => {
  const screenWidth = formatDisplayPixels(input.screenWidth);
  const screenHeight = formatDisplayPixels(input.screenHeight);
  const windowWidth = formatDisplayPixels(input.windowWidth);
  const windowHeight = formatDisplayPixels(input.windowHeight);
  const dpr = formatDevicePixelRatio(input.devicePixelRatio);
  if (!screenWidth || !screenHeight || !windowWidth || !windowHeight || !dpr) return null;
  return {
    dpr,
    screen: `${screenWidth}×${screenHeight}`,
    windowSize: `${windowWidth}×${windowHeight}`,
  };
};

export const formatClientDisplaySize = (
  input: ClientDisplaySizeInput,
  template: string,
): string | null => {
  const parts = getClientDisplaySizeParts(input);
  if (!parts) return null;
  return template
    .replaceAll("{{screen}}", parts.screen)
    .replaceAll("{{dpr}}", parts.dpr)
    .replaceAll("{{windowSize}}", parts.windowSize);
};
