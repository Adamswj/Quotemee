// Leveling system utilities for QuoteLearn

export interface LevelingConfig {
  level: number;
  totalXp: number;
  xpToNextLevel: number;
  title: string;
  emoji: string;
  levelProgress: number; // 0-100 percentage
}

export interface TitleTier {
  emoji: string;
  titles: string[];
  levelRange: [number, number];
}

// Title system configuration
export const TITLE_TIERS: TitleTier[] = [
  {
    emoji: "🌱",
    titles: ["Listener", "Collector", "Quoter"],
    levelRange: [1, 10]
  },
  {
    emoji: "🔎", 
    titles: ["Interpreter", "Scholar", "Conversationalist"],
    levelRange: [11, 25]
  },
  {
    emoji: "🔥",
    titles: ["Orator", "Philosopher", "Sage"],
    levelRange: [26, 50]
  },
  {
    emoji: "🏆",
    titles: ["Luminary", "Master of Words", "Living Library"],
    levelRange: [51, 100]
  }
];

// XP requirements per level tier
export const XP_REQUIREMENTS = {
  TIER_1: { levels: [1, 10], xpPerLevel: 150 },   // Levels 1-10: 150 XP each
  TIER_2: { levels: [11, 25], xpPerLevel: 250 },  // Levels 11-25: 250 XP each  
  TIER_3: { levels: [26, 50], xpPerLevel: 400 },  // Levels 26-50: 400 XP each
  TIER_4: { levels: [51, 100], xpPerLevel: 800 }  // Levels 51-100: 800 XP each
};

// XP rewards
export const XP_REWARDS = {
  QUOTE_PRACTICED: 10,
  DAILY_GOAL_BONUS: 20, // When 10 quotes practiced in single day
  STREAK_3_DAYS: 30,
  STREAK_7_DAYS: 100
};

/**
 * Calculate total XP required to reach a specific level
 */
export function getTotalXpForLevel(level: number): number {
  if (level <= 1) return 0;
  
  let totalXp = 0;
  
  // Tier 1: Levels 1-10 (100 XP each)
  const tier1Levels = Math.min(level - 1, 10);
  totalXp += tier1Levels * XP_REQUIREMENTS.TIER_1.xpPerLevel;
  
  if (level <= 10) return totalXp;
  
  // Tier 2: Levels 11-25 (200 XP each)
  const tier2Levels = Math.min(level - 11, 15);
  totalXp += tier2Levels * XP_REQUIREMENTS.TIER_2.xpPerLevel;
  
  if (level <= 25) return totalXp;
  
  // Tier 3: Levels 26-50 (400 XP each)
  const tier3Levels = Math.min(level - 26, 25);
  totalXp += tier3Levels * XP_REQUIREMENTS.TIER_3.xpPerLevel;
  
  if (level <= 50) return totalXp;
  
  // Tier 4: Levels 51-100 (800 XP each)
  const tier4Levels = Math.min(level - 51, 50);
  totalXp += tier4Levels * XP_REQUIREMENTS.TIER_4.xpPerLevel;
  
  return totalXp;
}

/**
 * Calculate level from total XP
 */
export function getLevelFromXp(xp: number): number {
  if (xp <= 0) return 1;
  
  // Binary search for efficient level calculation
  let low = 1;
  let high = 100;
  
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (getTotalXpForLevel(mid) <= xp) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  
  return Math.min(low, 100); // Cap at level 100
}

/**
 * Get title and emoji for a specific level
 */
export function getTitleForLevel(level: number): { title: string; emoji: string } {
  const tier = TITLE_TIERS.find(t => level >= t.levelRange[0] && level <= t.levelRange[1]);
  
  if (!tier) {
    // Fallback for levels above 100
    return { title: "Living Library", emoji: "🏆" };
  }
  
  // Distribute titles evenly across the level range
  const levelInTier = level - tier.levelRange[0];
  const tierSize = tier.levelRange[1] - tier.levelRange[0] + 1;
  const titleIndex = Math.floor((levelInTier / tierSize) * tier.titles.length);
  const clampedIndex = Math.min(titleIndex, tier.titles.length - 1);
  
  return {
    title: tier.titles[clampedIndex],
    emoji: tier.emoji
  };
}

/**
 * Calculate complete leveling information from XP
 */
export function calculateLevelingInfo(xp: number): LevelingConfig {
  const level = getLevelFromXp(xp);
  const { title, emoji } = getTitleForLevel(level);
  
  const currentLevelXp = getTotalXpForLevel(level);
  const nextLevelXp = level >= 100 ? currentLevelXp : getTotalXpForLevel(level + 1);
  const xpToNextLevel = level >= 100 ? 0 : nextLevelXp - xp;
  
  // Calculate progress percentage within current level
  let levelProgress = 0;
  if (level < 100) {
    const xpInCurrentLevel = xp - currentLevelXp;
    const xpNeededForCurrentLevel = nextLevelXp - currentLevelXp;
    levelProgress = (xpInCurrentLevel / xpNeededForCurrentLevel) * 100;
  } else {
    levelProgress = 100; // Max level
  }
  
  return {
    level,
    totalXp: xp,
    xpToNextLevel,
    title,
    emoji,
    levelProgress: Math.round(levelProgress)
  };
}

/**
 * Check if user should get streak bonus XP
 */
export function getStreakBonusXp(streak: number): number {
  if (streak === 7) return XP_REWARDS.STREAK_7_DAYS;
  if (streak === 3) return XP_REWARDS.STREAK_3_DAYS;
  return 0;
}

/**
 * Check if user should get daily goal bonus
 */
export function getDailyGoalBonusXp(quotesCompletedToday: number): number {
  return quotesCompletedToday >= 5 ? XP_REWARDS.DAILY_GOAL_BONUS : 0;
}

/**
 * Get days until next streak milestone
 */
export function getDaysToNextStreakMilestone(streak: number): { days: number; bonus: number } | null {
  if (streak < 3) {
    return { days: 3 - streak, bonus: XP_REWARDS.STREAK_3_DAYS };
  } else if (streak < 7) {
    return { days: 7 - streak, bonus: XP_REWARDS.STREAK_7_DAYS };
  }
  return null; // Already at max milestone
}