// shiftUtils.js

/** Total volunteer count across all locations at a given staffing level */
export function shiftCrewSize(shift, level = "vol_ideal") {
  const locs = shift.location;
  if (locs[level] !== undefined) return locs[level];
  return Object.values(locs).reduce((sum, loc) => sum + (loc[level] || 0), 0);
}