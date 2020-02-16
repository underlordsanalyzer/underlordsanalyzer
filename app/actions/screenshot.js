
export const TAKE_SCREENSHOT = 'TAKE_SCREENSHOT';
export const CAPTURED_SCREENSHOT = 'CAPTURED_SCREENSHOT';
export const NOOP_SCREENSHOT = 'NOOP_IGNORED';

export const takeScreenShot = () => ({
  type: TAKE_SCREENSHOT
});

export const capturedScreenShot = (image) => ({
  type: CAPTURED_SCREENSHOT,
  image
});
