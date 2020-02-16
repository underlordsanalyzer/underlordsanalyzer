
export const getRollChance = (unitsOnBoard, totalUnits, tierChance) => {
  return 5 * ((unitsOnBoard / totalUnits) * tierChance);
};
