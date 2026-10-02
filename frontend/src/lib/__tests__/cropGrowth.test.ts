import { describe, expect, it } from 'vitest';
import {
  calculateCropProgress,
  estimateHarvestDate,
  getCropGrowthProfile,
  getAllCropProfiles,
} from '../cropGrowth';

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
    const now = new Date();
    const fortyDaysAgo = new Date(now.getTime() - 40 * 86400000).toISOString().slice(0, 10);
    const harvestInSixtyDays = new Date(now.getTime() + 60 * 86400000).toISOString().slice(0, 10);

    const progress = calculateCropProgress(fortyDaysAgo, harvestInSixtyDays, 'Tomato', 'Growing');
    expect(progress.daysElapsed).toBe(40);
    expect(progress.totalDays).toBe(100);
    expect(progress.percent).toBe(40);
    expect(progress.daysRemaining).toBe(60);
    expect(progress.isReadyForHarvest).toBe(false);
  });

  it('detects ready for harvest when near maturity or harvested', () => {
    const now = new Date();
    const eightyFiveDaysAgo = new Date(now.getTime() - 85 * 86400000).toISOString().slice(0, 10);
    const harvestInFiveDays = new Date(now.getTime() + 5 * 86400000).toISOString().slice(0, 10);

    const progress = calculateCropProgress(eightyFiveDaysAgo, harvestInFiveDays, 'Tomato', 'Growing');
    expect(progress.isReadyForHarvest).toBe(true);

    const harvested = calculateCropProgress(eightyFiveDaysAgo, harvestInFiveDays, 'Tomato', 'Harvested');
    expect(progress.percent).toBeGreaterThan(90);
    expect(harvested.percent).toBe(100);
  });

  it('correctly maps physiological stages and timelines', () => {
    const now = new Date();
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 86400000).toISOString().slice(0, 10);
    const progress = calculateCropProgress(fifteenDaysAgo, null, 'Onion', 'Growing');

    expect(progress.stagesWithTimeline.length).toBe(4);
    expect(progress.currentStage).toBeDefined();
    expect(progress.currentStage.name).toBeDefined();
    expect(progress.currentStage.actionTip).toBeDefined();
  });
});
