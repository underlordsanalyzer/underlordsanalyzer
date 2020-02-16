import electron, { ipcRenderer } from 'electron';
import path from 'path';
import * as cv from 'opencv4nodejs';
import logger from '../utils/logging';
import * as imageUtils from './imageUtils';
import { loadAssets } from './assetLoader';
import {
  CANNY_SETTINGS,
  BOUNDING_OFFSET,
  HERO_DETECTION_SETTINGS,
  HERO_MATCH_SETTINGS,
  WORD_TEMPLATE_SETTINGS,
  HERO_TEMPLATE_SETTINGS,
  STAR_TEMPLATE_SETTINGS,
  STAR1_COLOR,
  STAR2_COLOR,
  STAR3_COLOR,
  PLAYER_BACKGROUND_COLOR,
  HERO_COVER_COLOR
} from './constants';
import { start } from 'repl';

const log = logger('Processor');
const assets = loadAssets();
let config = {
  debug: {
    roster: false,
    bench: false,
    row: {
      enabled: false
    }
  },
  heroConfig: {}
};

const getTextBounds = (image, type) => {
  const print = log.prefix(`GetTextBounds ${type}`);
  const asset = assets.identifiers[type].image;

  const matches = imageUtils.matchTemplate(image, asset, WORD_TEMPLATE_SETTINGS, config.debug[type] ? type : false);
  if (matches.length < 1) {
    print.warn(`Could not find ${type}`);
    return null;
  }
  const [obj] = matches;
  print.debug(`${type} Bounds`, { x: obj.x, y: obj.y });
  const backgroundPixel = image.at(obj.y, obj.x);
  return imageUtils.boundSprite(
    image,
    backgroundPixel,
    { left: obj.x - BOUNDING_OFFSET, top: obj.y - BOUNDING_OFFSET, right: obj.x + asset.cols + BOUNDING_OFFSET, bottom: obj.y + asset.rows + BOUNDING_OFFSET },
    config.debug[type] ? type : false
  );
}

const isRowDebugged = (rowNum, part) => {
  const print = log.prefix('isRowDebugged');
  print.debug('Config', JSON.stringify(config.debug.row));
  if (config.debug.row.enabled) {
    const resolveMode = (mode) => {
      switch (mode) {
        case 'name':
          print.debug('Resolving Name', config.debug.row.name);
          return config.debug.row.name;
        case 'number':
          const configPart = config.debug.row.part || 'all';
          if (config.debug.row.number !== rowNum) {
            print.debug('Resolving Number false rowNum', rowNum);
            return false;
          }
          if (configPart === 'all') {
            print.debug('Resolving Number true all');
            return true;
          }
          if (configPart === 'bench' && part !== 'board') {
            print.debug('Resolving Number true bench not board', part);
            return true;
          }
          if (configPart !== part) {
            print.debug('Resolving Number false part not part', part);
            return false;
          }
          print.debug('Resolving Number true end');
          return true;
        default:
          print.debug('Resolving Number false default');
          return false;
      }
    }

    switch (config.debug.row.mode) {
      case 'all':
        print.debug('Resolving All true');
        return true;
      case 'name':
        return resolveMode('name');
      case 'number':
        return resolveMode('number');
      case 'both':
        return resolveMode('number') ? resolveMode('name') : false;
      default:
        print.debug('Resolving Default false');
        return false;
    }
  }
  print.debug('Resolving Disabled false');
  return false;
}

const determineLevel = (rowImage, heroBounds, heroName, debug = false) => {
  const print = log.prefix('DetermineLevel');

  const star = assets.identifiers.star.image;
  const searchImage = rowImage.copy().getRegion(imageUtils.getRectFromBounds(Object.assign({}, heroBounds, {
    top: heroBounds.top + Math.ceil((heroBounds.bottom - heroBounds.top) / 2),
    left: Math.max(0, heroBounds.left - BOUNDING_OFFSET),
    right: Math.min(rowImage.cols, heroBounds.right + BOUNDING_OFFSET),
    bottom: rowImage.rows
  })));

  const starMatches = imageUtils.matchTemplate(searchImage, star, STAR_TEMPLATE_SETTINGS, debug);// || true);
  if (debug) {
    print.debug('Star Matches', starMatches);
    const debugImage = rowImage.copy();
    debugImage.drawRectangle(imageUtils.getRectFromBounds(heroBounds), new cv.Vec3(0, 0, 255), 2);
    cv.imshow('Searching', searchImage);
    cv.imshowWait('DetermineLevel', debugImage);
    cv.destroyAllWindows();
  }

  if (starMatches.length > 0) {
    const [match] = starMatches;
    const centerColor = searchImage.at(Math.ceil(match.y + star.rows / 2), Math.ceil(match.x + star.cols / 2));
    print.debug('Star Color', { red: centerColor.z, green: centerColor.y, blue: centerColor.x });
    let level = null;
    const COLOR_TOLERANCE = 10;
    if (imageUtils.pixelCompare(centerColor, new cv.Vec3(...STAR1_COLOR), COLOR_TOLERANCE)) {
      level = 1;
    } else if (imageUtils.pixelCompare(centerColor, new cv.Vec3(...STAR2_COLOR), COLOR_TOLERANCE)) {
      level = 2;
    } else if (imageUtils.pixelCompare(centerColor, new cv.Vec3(...STAR3_COLOR), COLOR_TOLERANCE)) {
      level = 3;
    } else {
      print.debug(`Unable to determine star color for ${heroName}`);
    }
    if (debug) {
      print.debug('Level', level);
      const centerLoc = { x: Math.ceil(match.x + star.cols / 2), y: Math.ceil(match.y + star.rows / 2) };
      print.debug('Star Center', centerLoc);
      cv.imshowWait('Searching', searchImage);
      cv.destroyAllWindows();
    }
    return level;
  }
  print.debug(`Unable to find star for ${heroName}`);
  return null;
}

const processRowTemplate = (image, rowBounds, rowId, debug = false) => {
  const print = log.prefix(`Process Row Template ${rowId}`);

  const results = { heroes: [], missing: false, rowId };
  const rowImage = image.copy().getRegion(imageUtils.getRectFromBounds(rowBounds));
  // const backgroundPixel = rowImage.at(BOUNDING_OFFSET, BOUNDING_OFFSET);
  const dupe = rowImage.copy();

  // Check if row empty
  const edged = rowImage.bgrToGray().canny(CANNY_SETTINGS[0], CANNY_SETTINGS[1]);
  const { maxVal } = edged.minMaxLoc();
  if (maxVal === 0) {
    // Empty Row
    // log.warn(`worker | Row ${rowId} is Empty`);
    // resolve(results);
    return results;
  }

  for (let heroId of Object.keys(assets.heroes)) {
    if (debug === true) {
      cv.imshowWait(`Debug ${assets.heroes[heroId].name}`, dupe);
      cv.destroyAllWindows();
    }
    const hero = assets.heroes[heroId];
    const heroThreshold = Number.parseInt(config.heroConfig[heroId]) || HERO_TEMPLATE_SETTINGS.threshold;
    const heroMatches = imageUtils.matchTemplate(rowImage, hero.image,
      Object.assign({}, HERO_TEMPLATE_SETTINGS, {
        threshold: heroThreshold,
        // canny: rowId.length > 1 ? { low: 5, high: 125, aperatureSize: 3 } : HERO_TEMPLATE_SETTINGS.canny
      }),
      debug === true || debug === hero.name ? hero.name : false);
    if (debug && heroMatches.length < 1) {
      print.debug('worker | processRow | Skipping', hero.name);
    }
    for (const heroMatch of heroMatches) {
      const heroBounds = {
        left: heroMatch.x,
        top: heroMatch.y,
        right: heroMatch.x + hero.image.cols,
        bottom: heroMatch.y + hero.image.rows
      };
      print.debug('Found', hero.name, heroMatches.length, heroBounds, heroMatches);
      const spriteBounds = heroBounds;
      const translateSprite = { top: rowBounds.top + spriteBounds.top, left: rowBounds.left + spriteBounds.left, right: rowBounds.left + spriteBounds.right, bottom: rowBounds.top + spriteBounds.bottom };
      const heroImage = image.getRegion(imageUtils.getRectFromBounds(translateSprite));
      const level = determineLevel(rowImage, heroBounds, hero.name, debug === true || debug === hero.name ? hero.name : false) || 1;
      results.heroes.push({ name: hero.name, tier: hero.tier, bounds: translateSprite, image: imageUtils.encodeImage(heroImage), level });

      dupe.drawRectangle(imageUtils.getRectFromBounds(spriteBounds), new cv.Vec3(0, 0, 255), 2);
      // image.drawRectangle(
      //   imageUtils.getRectFromBounds(translateSprite),
      //   new cv.Vec(0, 0, 255),
      //   2,
      //   cv.LINE_AA
      // );

      // Black out matched heroes
      rowImage.drawRectangle(imageUtils.getRectFromBounds(spriteBounds), new cv.Vec3(0, 0, 0), cv.FILLED);
      // rowImage.drawRectangle(imageUtils.getRectFromBounds(spriteBounds), new cv.Vec3(...HERO_COVER_COLOR), cv.FILLED);
    }
  }

  results.heroes = results.heroes.sort((h1, h2) => h1.bounds.left - h2.bounds.left);//.map(h => ({ name: h.name, level: h.level }));
  results.heroes.forEach(({ bounds }) => {
    image.drawRectangle(imageUtils.getRectFromBounds(bounds), new cv.Vec3(0, 0, 255), 2, cv.LINE_AA);
  })
  return results;

}

const processImage = (image) => {
  log.debug('Processing Image', config);
  const print = log.prefix('ProcessImage');

  try {
    const edged = image.bgrToGray().gaussianBlur(new cv.Size(5, 5), 1.2, 1.2, cv.BORDER_REFLECT).canny(CANNY_SETTINGS[0], CANNY_SETTINGS[1], CANNY_SETTINGS[2]);
    const computeStart = Date.now();
    const computedImage = { image: image.copy(), edged };
    const computeEnd = Date.now();
    print.debug('Image Compute Time', computeEnd - computeStart);
    // ipcRenderer.send('processed-section');

    const [rosterBounds, benchBounds, playerBounds] = ['roster', 'bench', 'player'].map(type => {
      const bounds = getTextBounds(computedImage.image, type);
      if (bounds) {
        if (config.debug[type]) {
          log.debug(`${type} Bounds`, bounds);
          const scene = computedImage.image.copy();
          scene.drawRectangle(imageUtils.getRectFromBounds(bounds), new cv.Vec3(0, 255, 0), 2);
          cv.imshowWait(`${type} Bounds`, scene);
          cv.destroyWindow(`${type} Bounds`);
        }
        return bounds;
      }
    });
    if (!rosterBounds) {
      ipcRenderer.send('noop', 'Could not find Roster');
      return;
    }
    if (!benchBounds) {
      ipcRenderer.send('noop', 'Could not find Bench');
      return;
    }
    if (!playerBounds) {
      print.warning('Could not find Player column');
    }

    const topRowBounds = {
      left: 0,
      top: rosterBounds.top,
      right: rosterBounds.left,
      bottom: rosterBounds.bottom
    };
    // topRowBounds.top -= 15;
    // topRowBounds.bottom += 30;
    const topRow = edged.getRegion(imageUtils.getRectFromBounds(topRowBounds));
    const topRowVerticals = imageUtils.getVerticals(topRow);
    if (topRowVerticals) {
      const [right, left] = topRowVerticals
        .sort((l1, l2) => l2.pt1.x - l1.pt1.x)
        .slice(1, 3)
        .map(l => l.pt1.x);
      topRowBounds.left = left;
      topRowBounds.right = right;
    }

    const rosterBoardBounds = { left: rosterBounds.left - BOUNDING_OFFSET, top: rosterBounds.top, right: rosterBounds.right + BOUNDING_OFFSET, bottom: computedImage.image.rows };
    const rosterBoard = edged.getRegion(imageUtils.getRectFromBounds(rosterBoardBounds));
    const rowLines = imageUtils.getHorizontals(rosterBoard, config.debug.grid).sort((l1, l2) => l1.pt1.y - l2.pt2.y);
    const rowHeight = rowLines[2].pt1.y - rowLines[1].pt1.y;
    // Determine rows
    print.debug('Row Height', rowHeight);
    const buffer = Math.floor(rowHeight / 15);
    const rowPromises = [];
    const rowData = [];
    let prevTop = rosterBounds.bottom + 1 - rowHeight;
    for (let row = 0; row < 8; row++) {
      // const top = (rosterBounds.bottom + 1) + (row * rowHeight);
      // const bottom = firstRowBottom + (row * rowHeight);
      const top = prevTop + rowHeight;
      prevTop = top;// + 1;
      const bottom = top + rowHeight;
      const halfPoint = top + Math.ceil((bottom - top) / 2) + buffer;
      const nameTop = top + Math.ceil((bottom - top) * 3 / 4) + buffer;
      const rowBounds = { top, left: rosterBounds.left, right: rosterBounds.right, bottom: halfPoint - BOUNDING_OFFSET };
      print.debug('Row Bounds', row, rowBounds);
      const topBenchRowBounds = { top, left: benchBounds.left, right: benchBounds.right, bottom: halfPoint - BOUNDING_OFFSET };
      const bottomBenchRowBounds = { top: halfPoint - BOUNDING_OFFSET, left: benchBounds.left, right: benchBounds.right, bottom: bottom };
      const nameRowBounds = { top: nameTop - (2 * BOUNDING_OFFSET), left: topRowBounds.left, right: topRowBounds.right, bottom: bottom };
      const nameImg = imageUtils.encodeImage(computedImage.image.getRegion(imageUtils.getRectFromBounds(nameRowBounds)));
      if (config.debug.grid) {
        computedImage.image.drawRectangle(
          imageUtils.getRectFromBounds(rowBounds),
          new cv.Vec3(0, 0, 255),
          2);
        computedImage.image.drawRectangle(
          imageUtils.getRectFromBounds(topBenchRowBounds),
          new cv.Vec3(0, 255, 255),
          2);
        computedImage.image.drawRectangle(
          imageUtils.getRectFromBounds(bottomBenchRowBounds),
          new cv.Vec3(0, 255, 0),
          2);
      }

      // if (row === 1) {
      // computedImage.image.drawRectangle(
      //   imageUtils.getRectFromBounds(rowBounds),
      //   new cv.Vec3(0, 0, 255),
      //   2);
      // computedImage.image.drawRectangle(
      //   imageUtils.getRectFromBounds(topBenchRowBounds),
      //   new cv.Vec3(0, 255, 255),
      //   2);
      // computedImage.image.drawRectangle(
      //   imageUtils.getRectFromBounds(bottomBenchRowBounds),
      //   new cv.Vec3(0, 255, 0),
      //   2);
      // if (row === 0) {
      const totalStart = Date.now();
      const rowStart = Date.now();
      const rowResults = processRowTemplate(computedImage.image, rowBounds, row, isRowDebugged(row, 'board'));
      const rowEnd = Date.now();
      const topBenchStart = Date.now();
      const topBenchResults = processRowTemplate(computedImage.image, topBenchRowBounds, `${row}${row}`, isRowDebugged(row, 'benchtop'));
      const topBenchEnd = Date.now();
      const bottomBenchStart = Date.now();
      const bottomBenchResults = processRowTemplate(computedImage.image, bottomBenchRowBounds, `${row}${row}`, isRowDebugged(row, 'benchbottom'));
      const bottomBenchEnd = Date.now();
      const totalEnd = Date.now();
      print.debug(`Row ${row} Time`, rowEnd - rowStart);
      print.debug(`Top Bench ${row} Time`, topBenchEnd - topBenchStart);
      print.debug(`Bottom Bench ${row} Time`, bottomBenchEnd - bottomBenchStart);
      print.debug(`Total Row ${row} Time`, totalEnd - totalStart);

      // print(`worker | Row ${row} Results`, rowResults);
      // print(`worker | Top Bench ${row} Results`, topBenchResults);
      // print(`worker | Bottom Bench ${row} Results`, bottomBenchResults);
      // }
      // rowPromises.push(processRow(image, rowBounds, row).catch(err => console.error('ROW', err)));
      // rowPromises.push(processRow(image, topBenchRowBounds, '' + row + row).catch(err => console.error('TOP BENCH', err)));
      // rowPromises.push(processRow(image, bottomBenchRowBounds, '' + row + row + row).catch(err => console.error('BOTTOM BENCH', err)));
      // }

      rowData[row] = {
        nameImg,
        board: rowResults,
        bench: {
          top: topBenchResults,
          bottom: bottomBenchResults
        }
      };

      const backgroundColor = computedImage.image.at(rowBounds.top + BOUNDING_OFFSET, rowBounds.left + BOUNDING_OFFSET);
      print.debug('Background Color', { red: backgroundColor.z, green: backgroundColor.y, blue: backgroundColor.x });
      if (imageUtils.pixelCompare(backgroundColor, new cv.Vec3(...PLAYER_BACKGROUND_COLOR), 10)) {
        rowData[row].isPlayer = true;
        print.debug(`Player is row ${row}`);
        // TODO Replace with image parsing logic
        rowData[row].playerLevel = rowResults.heroes.length;
      }
      // }
    }
    if (config.debug.grid || config.debug.roster) {
      computedImage.image.drawRectangle(
        imageUtils.getRectFromBounds(rosterBounds),
        new cv.Vec3(255, 0, 255),
        2);
    }
    if (config.debug.grid || config.debug.bench) {
      computedImage.image.drawRectangle(
        imageUtils.getRectFromBounds(benchBounds),
        new cv.Vec3(255, 0, 255),
        2);
    }

    ipcRenderer.send('processed-ss', { image: imageUtils.encodeImage(computedImage.image), data: rowData });

    cv.imshowWait('Both', computedImage.image);
    cv.destroyAllWindows();
  } catch (err) {
    log.error('Unhandled error', err);
    log.error(err.stack);
    ipcRenderer.send('noop', err.message);
  }
}

ipcRenderer.on('process-ss', (_, image) => {
  log.debug('Received SS');
  const mat = imageUtils.decodeImage(image);
  if (config.screenshot.enabled) {
    log.debug(`Saving screenshot to ${config.screenshot.location}`);
    cv.imwrite(config.screenshot.location, mat);
  }
  processImage(mat);
});

ipcRenderer.on('update-config', (_, region, updatedConfig) => {
  if (region === 'processing') {
    log.debug('Processor Updating Config', updatedConfig);
    config = updatedConfig.processing;
    config.screenshot = { enabled: updatedConfig.global.screenshotDebugging, location: updatedConfig.global.screenshotLocation };
  }
});