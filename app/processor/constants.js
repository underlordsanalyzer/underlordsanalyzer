export const BOUNDING_OFFSET = 5;
export const CANNY_SETTINGS = [50, 220, 5];
export const RATIO_CONSTANT = 0.1088;

export const HERO_DETECTION_SETTINGS = { nFeatures: 1500, nOctaveLayers: 4, sigma: 0.8, constrastThreshold: 0.03, edgeThreshold: 50 };
// const HERO_DETECTION_SETTINGS = { nFeatures: 250, nOctaveLayers: 4, sigma: 1 };
export const HERO_MATCH_SETTINGS = { threshold: 2, maxDistance: 20000, thresholdDistance: 5000 };
// export const HERO_MATCH_SETTINGS = { threshold: 2, maxDistance: 300, thresholdDistance: 150 };

export const WORD_TEMPLATE_SETTINGS = { threshold: 9000000, bottom: 5000000 };
export const HERO_TEMPLATE_SETTINGS = { threshold: 3350000, bottom: 1000000, canny: { low: 50, high: 200, aperatureSize: 3 } };
export const STAR_TEMPLATE_SETTINGS = { threshold: 900000, bottom: 500000 };

// Blue, Green, Red
export const STAR1_COLOR = [143, 159, 179];
export const STAR2_COLOR = [222, 200, 185];
export const STAR3_COLOR = [84, 244, 245];

export const PLAYER_BACKGROUND_COLOR = [73, 51, 55];

export const HERO_COVER_COLOR = [0, 0, 0];