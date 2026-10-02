import { describe, expect, it } from 'vitest';
import {
  calculateCropProgress,
  estimateHarvestDate,
  getCropGrowthProfile,
  getAllCropProfiles,
} from '../cropGrowth';

/**
 * Build a 'YYYY-MM-DD' string `offset` days from today using *local* calendar
 * parts.
 *
 * The obvious `new Date(Date.now() + n*86400000).toISOString().slice(0,10)` is
 * wrong here: toISOString() reports the UTC date, so in any timezone whose
 * offset shifts the day it silently produces a date one day off, and the
 * assertions below then fail depending on the time of day they run.
 */
function localDateOffset(offset: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

describe('cropGrowth', () => {
  it('loads all popular crop profiles with standard stages and durations', () => {
    const profiles = getAllCropProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(10);

    const onion = getCropGrowthProfile('Onion');
    expect(onion.nameEn).toBe('Onion');
    expect(onion.durationDays).toBe(120);
    expect(onion.stages.length).toBeGreaterThanOrEqual(4);

    const tomato = getCropGrowthProfile('Tomato');
    expect(tomato.durationDays).toBe(90);

    const wheat = getCropGrowthProfile('Wheat');
    expect(wheat.durationDays).toBe(120);

    const cotton = getCropGrowthProfile('Cotton');
    expect(cotton.durationDays).toBe(165);
  });

  it('matches aliases and case-insensitive crop names', () => {
    const pyaz = getCropGrowthProfile('pyaz');
    expect(pyaz.nameEn).toBe('Onion');

    const paddy = getCropGrowthProfile('Paddy');
    expect(paddy.nameEn).toBe('Rice (Paddy)');

    const gehu = getCropGrowthProfile('gehu');
    expect(gehu.nameEn).toBe('Wheat');

    const unknown = getCropGrowthProfile('Dragonfruit');
    expect(unknown.nameEn).toBe('Dragonfruit');
    expect(unknown.durationDays).toBe(110);
  });

  it('estimates harvest date based on sowing date and duration', () => {
    const sowing = '2026-06-01';
    const harvest = estimateHarvestDate(sowing, 'Onion'); // 120 days
    // 2026-06-01 + 120 days = 2026-09-29
    expect(harvest).toBe('2026-09-29');

    const tomatoHarvest = estimateHarvestDate(sowing, 'Tomato'); // 90 days
    expect(tomatoHarvest).toBe('2026-08-30');
  });

  it('calculates progress percentage, days elapsed and days remaining', () => {
    const fortyDaysAgo = localDateOffset(-40);
    const harvestInSixtyDays = localDateOffset(60);

    const progress = calculateCropProgress(fortyDaysAgo, harvestInSixtyDays, 'Tomato', 'Growing');
    expect(progress.daysElapsed).toBe(40);
    expect(progress.totalDays).toBe(100);
    expect(progress.percent).toBe(40);
    expect(progress.daysRemaining).toBe(60);
    expect(progress.isReadyForHarvest).toBe(false);
  });

  it('detects ready for harvest when near maturity or harvested', () => {
    const eightyFiveDaysAgo = localDateOffset(-85);
    const harvestInFiveDays = localDateOffset(5);

    const progress = calculateCropProgress(eightyFiveDaysAgo, harvestInFiveDays, 'Tomato', 'Growing');
    expect(progress.isReadyForHarvest).toBe(true);

    const harvested = calculateCropProgress(eightyFiveDaysAgo, harvestInFiveDays, 'Tomato', 'Harvested');
    expect(progress.percent).toBeGreaterThan(90);
    expect(harvested.percent).toBe(100);
  });

  it('correctly maps physiological stages and timelines', () => {
    const fifteenDaysAgo = localDateOffset(-15);
    const progress = calculateCropProgress(fifteenDaysAgo, null, 'Onion', 'Growing');

    expect(progress.stagesWithTimeline.length).toBe(4);
    expect(progress.currentStage).toBeDefined();
    expect(progress.currentStage.name).toBeDefined();
    expect(progress.currentStage.actionTip).toBeDefined();
  });

  it('counts calendar days, not elapsed milliseconds', () => {
    // Fixed 100-day span, independent of today's date, so the day maths cannot
    // drift with the timezone of whoever runs the suite.
    const progress = calculateCropProgress('2026-06-01', '2026-09-09', 'Tomato', 'Growing');
    expect(progress.totalDays).toBe(100);

    // A window straddling today must split exactly, with nothing lost or
    // double-counted between the two sides.
    const live = calculateCropProgress(localDateOffset(-40), localDateOffset(60), 'Tomato', 'Growing');
    expect(live.totalDays).toBe(100);
    expect(live.daysElapsed).toBe(40);
    expect(live.daysRemaining).toBe(60);
    expect(live.daysElapsed + live.daysRemaining).toBe(live.totalDays);
  });

  it('emits the harvest date as the same calendar day it displays', () => {
    const progress = calculateCropProgress('2026-06-01', '2026-09-09', 'Tomato', 'Growing');
    // This ISO field is what gets persisted and sent to the API, so it has to
    // agree with the date shown to the farmer. toISOString() used to shift it a
    // day earlier for anyone east of UTC.
    expect(progress.estimatedHarvestDateISO).toBe('2026-09-09');
    expect(progress.estimatedHarvestDateFormatted).toContain('2026');
  });

  it('adds duration in calendar days across a DST transition', () => {
    // Northern-hemisphere DST begins in late March. Tomato is a 90-day crop, so
    // 2026-03-01 + 90 days is 2026-05-30 - and it must stay that date whether or
    // not the 23-hour day falls inside the window.
    expect(estimateHarvestDate('2026-03-01', 'Tomato')).toBe('2026-05-30');
  });
});
