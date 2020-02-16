import * as cv from 'opencv4nodejs';
import logger from '../utils/logging';
const log = logger('ImageUtils');

const printPoint = (point) => ({ x: point.x, y: point.y });

const printLine = (line) => ({ pt1: printPoint(line.pt1), pt2: printPoint(line.pt2) });

// How many pixels off to be considered the same line
const SIMILAR_LINE_CONFIDENCE = 10;
export const matchTemplate = (scene, obj, options, debug = false) => {
  const print = log.prefix('matchTemplate');
  options = options || {};
  if (!options.hasOwnProperty('threshold')) { // If maxVal is less, reject
    options.threshold = 3000000;
  }
  if (!options.hasOwnProperty('bottom')) { // If maxVal is less, break
    options.bottom = 1000000;
  }
  if (!options.hasOwnProperty('maxScale')) {
    options.maxScale = 1;
  }
  if (!options.hasOwnProperty('minScale')) {
    options.minScale = 0.4;
  }
  if (!options.hasOwnProperty('steps')) {
    options.steps = 20;
  }
  if (!options.hasOwnProperty('canny')) {
    options.canny = { low: 50, high: 200, aperatureSize: 3 };
  }
  let start = Date.now();

  const grayScene = scene.copy().bgrToGray().canny(options.canny.low, options.canny.high, options.canny.aperatureSize);
  const grayObj = obj.copy().bgrToGray();

  const allMatches = [];
  while (1) {
    let bestMatch = { val: 0 };
    for (let scale = options.maxScale; scale >= options.minScale; scale -= (options.maxScale - options.minScale) / options.steps) {
      const resized = grayObj.rescale(scale);
      const ratio = grayScene.cols / resized.cols;

      const edged = resized.canny(50, 200);
      const result = grayScene.matchTemplate(edged, cv.TM_CCOEFF);

      const { maxVal, maxLoc } = cv.minMaxLoc(result);

      if (debug) {
        print.debug('MaxVal', maxVal);
        // cv.imshow('GrayScene', grayScene);
        // cv.imshowWait('Edged:' + scale, edged);
        // cv.destroyAllWindows();
      }

      if (maxVal < options.bottom) {
        if (debug) {
          print.debug(`MaxVal below bottom (${maxVal} < ${options.bottom})`);
        }
        break;
      }
      if (maxVal < options.threshold) {
        if (debug) {
          print.debug(`MaxVal below threshold (${maxVal} < ${options.threshold})`);
        }
        continue;
      }
      if (bestMatch.val < maxVal) {
        bestMatch.val = maxVal;
        bestMatch.loc = maxLoc;
        if (debug) {
          print.debug('Found match', maxVal);
        }
      }
    }
    if (!bestMatch.loc) {
      if (debug) {
        print.debug('No BestMatch found - breaking');
      }
      break;
    }
    grayScene.drawRectangle(new cv.Rect(bestMatch.loc.x, bestMatch.loc.y, grayObj.cols, grayObj.rows), new cv.Vec3(0, 0, 0), cv.FILLED);
    allMatches.push(bestMatch.loc);
    if (debug) {
      print.debug('Storing best match', bestMatch);
      const debugScene = scene.copy();
      debugScene.drawRectangle(new cv.Rect(bestMatch.loc.x, bestMatch.loc.y, grayObj.cols, grayObj.rows), new cv.Vec3(0, 255, 0), 2);
      cv.imshowWait(`${debug} Template Matched`, debugScene);
      cv.destroyAllWindows();
    }
  }
  const end = Date.now();
  if (debug) {
    print.debug('Match Time', end - start);
  }
  return allMatches;
};

export const getRectFromBounds = (bounds) => new cv.Rect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);

// Expects image to be edged
export const getStraightLines = (image, axis = 'x', debug = false) => {
  const AXIS_SETTINGS = axis === 'x' ? [10, 5, 5] : [50, 50, 15];
  const hLines = image.houghLinesP(1, 15 * Math.PI / 180, ...AXIS_SETTINGS);
  const lines = [];

  if (debug) {
    image = image.cvtColor(cv.COLOR_GRAY2BGR);
  }
  const deduped = hLines.reduce((filtered, curLine) => {
    const { x: y1, y: x2, w: x1, z: y2 } = curLine;
    const pt1 = new cv.Point2(x1, y1);
    const pt2 = new cv.Point2(x2, y2);
    if (pt1[axis] !== pt2[axis]) {
      // Skipping non straight lines
      return filtered;
    }
    return [...filtered.filter(l2 => {
      if (l2.pt1.x === pt1.x && l2.pt1.y === pt1.y && l2.pt2.x === pt2.x && l2.pt2.y === pt2.y) {
        // Same line
        return true;
      }
      if (Math.abs(pt1[axis] - l2.pt1[axis]) < SIMILAR_LINE_CONFIDENCE) {
        // Remove close tolerances
        return false;
      } else {
        return true;
      }
    }), { pt1, pt2 }];
  }, []);
  if (debug) {
    for (let line of deduped) {
      image.drawLine(line.pt1, line.pt2, new cv.Vec3(0, 0, 255), 2);
    }
    // cv.imshow('Blurred', blurred);
    cv.imshowWait(`Hough ${axis}`, image);
    cv.destroyAllWindows();
  }
  return deduped;
};

export const getHorizontals = (image, debug = false) => getStraightLines(image, 'y', debug);

export const getVerticals = (image, debug = false) => getStraightLines(image, 'x', debug);

// Returns bounding rectangle for small hero template and background color
// Searches up, right, down, left from template until maximum edge of background color
export const boundSprite = (haystack, backgroundPixel, bounds, debug = false) => {
  const print = log.prefix('Bound Sprite');

  if (debug) {
    print.debug(`Background Pixel r:${backgroundPixel.z} g:${backgroundPixel.y} b:${backgroundPixel.x}`);
    print.debug('Bounds', bounds);
    const copy = haystack.copy();
    copy.drawRectangle(getRectFromBounds(bounds), new cv.Vec3(0, 0, 255), 2);
    cv.imshowWait(`Bound Sprite ${debug}`, copy);
    cv.destroyAllWindows();
  }

  const findEdge = (prop, fixed, start, end, increment) => {
    for (let val = start; Math.abs(end - val) > 0; val += increment) {
      const pixel = prop === 'x' ? haystack.at(fixed, val) : haystack.at(val, fixed);
      if (!pixelCompare(pixel, backgroundPixel)) {
        return val - increment;
      }
    }
    return end;
  }

  return {
    top: findEdge('y', bounds.left, bounds.top, 0, -1),
    left: findEdge('x', bounds.top, bounds.left, 0, -1),
    right: findEdge('x', bounds.top, bounds.right, haystack.cols, 1),
    bottom: findEdge('y', bounds.left, bounds.bottom, haystack.rows, 1)
  };
};

export const decodeImage = (base64Data) => {
  const base64data = base64Data.replace('data:image/jpeg;base64', '')
    .replace('data:image/png;base64', '');//Strip image type prefix
  const buffer = Buffer.from(base64data, 'base64');
  return cv.imdecode(buffer); //Image is now represented as Mat
}

export const encodeImage = (image) => `data:image/png;base64,${cv.imencode('.png', image).toString('base64')}`;

export const packageMat = (mat) => ({ data: mat.getDataAsArray(), type: mat.type });

export const unpackageMat = ({ data, type }) => new cv.Mat(data, type);

export const withinTolerance = (col1, col2, tol) => Math.abs(col1 - col2) <= tol;

export const pixelCompare = (pixel1, pixel2, tolerance = 5) => {
  return withinTolerance(pixel1.z, pixel2.z, tolerance) &&
    withinTolerance(pixel1.y, pixel2.y, tolerance) &&
    withinTolerance(pixel1.x, pixel2.x, tolerance);
}