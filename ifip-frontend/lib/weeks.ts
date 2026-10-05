/** Default programme length used when a cohort has no explicit totalWeeks. */
export const DEFAULT_TOTAL_WEEKS = 4;
export const MAX_TOTAL_WEEKS = 52;

/**
 * Builds a sorted list of week numbers: 1..totalWeeks, plus any higher week
 * numbers already present in the data so existing content is never hidden.
 */
export const buildWeekList = (
  totalWeeks: number | undefined,
  ...weekNumberSources: Array<Array<number | undefined | null>>
): number[] => {
  const base = Math.max(1, Math.min(totalWeeks || DEFAULT_TOTAL_WEEKS, MAX_TOTAL_WEEKS));
  const set = new Set<number>();
  for (let i = 1; i <= base; i++) set.add(i);
  weekNumberSources.flat().forEach(w => {
    if (typeof w === "number" && Number.isInteger(w) && w >= 1) set.add(w);
  });
  return Array.from(set).sort((a, b) => a - b);
};
