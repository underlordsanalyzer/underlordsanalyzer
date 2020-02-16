import { HERO_DETECTION_SETTINGS } from './constants';
import * as imageUtils from './imageUtils';
import { parseHeroName } from '../utils/heroes';

export const loadAssets = () => {
  const rawAssets = require('./assets');
  const processedIdentifiers = Object.keys(rawAssets.identifiers).reduce((res, id) => {
    const rawAsset = rawAssets.identifiers[id];
    const image = imageUtils.decodeImage(rawAsset);
    res[id] = { name: id, image };
    return res;
  }, {});
  const processedHeroes = Object.keys(rawAssets.heroes).reduce((res, id) => {
    const { tier, icon } = rawAssets.heroes[id];
    const image = imageUtils.decodeImage(icon);
    res[id] = { name: parseHeroName(id), image, tier };
    return res;
  }, {});
  return { identifiers: processedIdentifiers, heroes: processedHeroes };
}
