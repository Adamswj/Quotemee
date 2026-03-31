var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/handler.ts
import express from "express";
import path from "path";
import fs from "fs";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  achievements: () => achievements,
  achievementsRelations: () => achievementsRelations,
  categories: () => categories,
  categoriesRelations: () => categoriesRelations,
  emailVerificationTokens: () => emailVerificationTokens,
  favorites: () => favorites,
  favoritesRelations: () => favoritesRelations,
  insertAchievementSchema: () => insertAchievementSchema,
  insertCategorySchema: () => insertCategorySchema,
  insertEmailVerificationTokenSchema: () => insertEmailVerificationTokenSchema,
  insertFavoriteSchema: () => insertFavoriteSchema,
  insertPasswordResetTokenSchema: () => insertPasswordResetTokenSchema,
  insertQuizSessionSchema: () => insertQuizSessionSchema,
  insertQuoteSchema: () => insertQuoteSchema,
  insertUserAchievementSchema: () => insertUserAchievementSchema,
  insertUserProgressSchema: () => insertUserProgressSchema,
  passwordResetTokens: () => passwordResetTokens,
  quizSessions: () => quizSessions,
  quizSessionsRelations: () => quizSessionsRelations,
  quotes: () => quotes,
  quotesRelations: () => quotesRelations,
  sessions: () => sessions,
  userAchievements: () => userAchievements,
  userAchievementsRelations: () => userAchievementsRelations,
  userProgress: () => userProgress,
  userProgressRelations: () => userProgressRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  doublePrecision
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  username: varchar("username", { length: 50 }),
  email: varchar("email"),
  password: varchar("password"),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: varchar("profile_image_url"),
  emailVerified: boolean("email_verified").default(false),
  xp: integer("xp").default(0),
  level: integer("level").default(1),
  streak: integer("streak").default(0),
  title: varchar("title", { length: 100 }).default("Listener"),
  dailyXp: integer("daily_xp").default(0),
  dailyGoalCompleted: boolean("daily_goal_completed").default(false),
  lastActiveDate: timestamp("last_active_date").defaultNow(),
  lastStreakDate: timestamp("last_streak_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  used: boolean("used").default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  icon: varchar("icon", { length: 50 }).notNull(),
  color: varchar("color", { length: 50 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow()
});
var quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  author: varchar("author", { length: 200 }).notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  source: varchar("source", { length: 300 }),
  year: integer("year"),
  difficulty: integer("difficulty").default(1),
  // 1-5 scale
  createdAt: timestamp("created_at").defaultNow()
});
var favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  quoteId: integer("quote_id").references(() => quotes.id).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  quoteId: integer("quote_id").references(() => quotes.id).notNull(),
  masteryLevel: integer("mastery_level").default(0),
  // 0-5 scale
  timesStudied: integer("times_studied").default(0),
  correctAnswers: integer("correct_answers").default(0),
  totalAnswers: integer("total_answers").default(0),
  lastStudied: timestamp("last_studied").defaultNow(),
  // Spaced repetition fields
  easeFactor: doublePrecision("ease_factor").default(2.5),
  // SuperMemo algorithm ease factor
  interval: integer("interval").default(1),
  // Days until next review
  nextReview: timestamp("next_review").defaultNow(),
  repetitions: integer("repetitions").default(0),
  // Number of successful repetitions
  stage: varchar("stage", { length: 20 }).default("learning"),
  // learning, review, mastered
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var quizSessions = pgTable("quiz_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  score: integer("score").default(0),
  totalQuestions: integer("total_questions").default(0),
  xpEarned: integer("xp_earned").default(0),
  completedAt: timestamp("completed_at").defaultNow()
});
var achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }).notNull(),
  xpReward: integer("xp_reward").default(0),
  requirement: jsonb("requirement"),
  // Store achievement requirements as JSON
  createdAt: timestamp("created_at").defaultNow()
});
var userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  achievementId: integer("achievement_id").references(() => achievements.id).notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow()
});
var usersRelations = relations(users, ({ many }) => ({
  favorites: many(favorites),
  progress: many(userProgress),
  quizSessions: many(quizSessions),
  achievements: many(userAchievements)
}));
var categoriesRelations = relations(categories, ({ many }) => ({
  quotes: many(quotes)
}));
var quotesRelations = relations(quotes, ({ one, many }) => ({
  category: one(categories, {
    fields: [quotes.categoryId],
    references: [categories.id]
  }),
  favorites: many(favorites),
  progress: many(userProgress)
}));
var favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id]
  }),
  quote: one(quotes, {
    fields: [favorites.quoteId],
    references: [quotes.id]
  })
}));
var userProgressRelations = relations(userProgress, ({ one }) => ({
  user: one(users, {
    fields: [userProgress.userId],
    references: [users.id]
  }),
  quote: one(quotes, {
    fields: [userProgress.quoteId],
    references: [quotes.id]
  })
}));
var quizSessionsRelations = relations(quizSessions, ({ one }) => ({
  user: one(users, {
    fields: [quizSessions.userId],
    references: [users.id]
  })
}));
var achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements)
}));
var userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id]
  }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id]
  })
}));
var insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true
});
var insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true
});
var insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true
});
var insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  nextReview: true
});
var insertQuizSessionSchema = createInsertSchema(quizSessions).omit({
  id: true,
  completedAt: true
});
var insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  createdAt: true
});
var insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  unlockedAt: true
});
var insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).omit({
  id: true,
  createdAt: true
});
var insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true
});

// server/db.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var sql = neon(process.env.DATABASE_URL);
var db = drizzle(sql, { schema: schema_exports });

// server/storage.ts
import { eq, desc, and, sql as sql2, count, lte } from "drizzle-orm";

// server/spacedRepetition.ts
var SpacedRepetitionEngine = class {
  // Minimum ease factor to prevent cards from becoming too difficult
  static MIN_EASE_FACTOR = 1.3;
  // Maximum interval in days (6 months)
  static MAX_INTERVAL = 180;
  // Learning steps for new cards (in minutes)
  static LEARNING_STEPS = [1, 10, 60, 1440];
  // 1min, 10min, 1hour, 1day
  // Graduate to review phase after this many successful learning steps
  static GRADUATION_THRESHOLD = 3;
  /**
   * Calculate next review based on performance
   */
  static calculateNextReview(currentData, result) {
    const { quality } = result;
    let { easeFactor, interval, repetitions, stage } = currentData;
    if (stage === "learning") {
      return this.handleLearningPhase(currentData, quality);
    }
    if (quality < 3) {
      return {
        easeFactor: Math.max(easeFactor - 0.2, this.MIN_EASE_FACTOR),
        interval: 1,
        nextReview: this.addMinutesToDate(/* @__PURE__ */ new Date(), this.LEARNING_STEPS[0]),
        repetitions: 0,
        stage: "learning"
      };
    }
    easeFactor = Math.max(
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
      this.MIN_EASE_FACTOR
    );
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.min(
        Math.round(interval * easeFactor),
        this.MAX_INTERVAL
      );
    }
    repetitions += 1;
    const newStage = repetitions >= 8 && quality >= 4 ? "mastered" : "review";
    return {
      easeFactor,
      interval,
      nextReview: this.addDaysToDate(/* @__PURE__ */ new Date(), interval),
      repetitions,
      stage: newStage
    };
  }
  /**
   * Handle learning phase progression
   */
  static handleLearningPhase(currentData, quality) {
    const { repetitions } = currentData;
    if (quality < 3) {
      return {
        ...currentData,
        repetitions: 0,
        nextReview: this.addMinutesToDate(/* @__PURE__ */ new Date(), this.LEARNING_STEPS[0]),
        stage: "learning"
      };
    }
    const newRepetitions = repetitions + 1;
    if (newRepetitions >= this.GRADUATION_THRESHOLD) {
      return {
        easeFactor: 2.5,
        interval: 1,
        nextReview: this.addDaysToDate(/* @__PURE__ */ new Date(), 1),
        repetitions: 0,
        stage: "review"
      };
    }
    const stepIndex = Math.min(newRepetitions, this.LEARNING_STEPS.length - 1);
    const nextStepMinutes = this.LEARNING_STEPS[stepIndex];
    return {
      ...currentData,
      repetitions: newRepetitions,
      nextReview: this.addMinutesToDate(/* @__PURE__ */ new Date(), nextStepMinutes),
      stage: "learning"
    };
  }
  /**
   * Get cards due for review
   */
  static getCardsForReview(progressData) {
    const now = /* @__PURE__ */ new Date();
    return progressData.filter((card) => {
      const nextReview = new Date(card.nextReview);
      return nextReview <= now;
    });
  }
  /**
   * Prioritize cards for optimal learning
   */
  static prioritizeCards(cards) {
    return cards.sort((a, b) => {
      const aOverdue = this.getDaysOverdue(a);
      const bOverdue = this.getDaysOverdue(b);
      if (a.stage === "learning" && a.repetitions > 2 && b.stage !== "learning") return -1;
      if (b.stage === "learning" && b.repetitions > 2 && a.stage !== "learning") return 1;
      if (aOverdue > 0 && bOverdue <= 0) return -1;
      if (bOverdue > 0 && aOverdue <= 0) return 1;
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;
      if (a.stage === "learning" && b.stage !== "learning") return -1;
      if (b.stage === "learning" && a.stage !== "learning") return 1;
      return new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime();
    });
  }
  /**
   * Get recommended study session size
   */
  static getRecommendedSessionSize(totalDue, userLevel) {
    const baseSize = Math.min(totalDue, 20);
    const levelMultiplier = Math.min(userLevel / 10, 2);
    return Math.max(5, Math.min(Math.round(baseSize * levelMultiplier), 50));
  }
  /**
   * Calculate study statistics
   */
  static calculateStudyStats(progressData) {
    const now = /* @__PURE__ */ new Date();
    const dueToday = progressData.filter((card) => {
      const nextReview = new Date(card.nextReview);
      return nextReview <= now;
    }).length;
    const learning = progressData.filter((card) => card.stage === "learning").length;
    const review = progressData.filter((card) => card.stage === "review").length;
    const mastered = progressData.filter((card) => (card.masteryLevel || 0) >= 5).length;
    const averageEase = progressData.length > 0 ? progressData.reduce((sum, card) => sum + (card.easeFactor || 2.5), 0) / progressData.length : 2.5;
    return {
      totalCards: progressData.length,
      dueToday,
      learning,
      review,
      mastered,
      averageEase: Math.round(averageEase * 100) / 100
    };
  }
  /**
   * Helper: Add days to date
   */
  static addDaysToDate(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
  /**
   * Helper: Add minutes to date
   */
  static addMinutesToDate(date, minutes) {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  }
  /**
   * Helper: Get days overdue
   */
  static getDaysOverdue(card) {
    const now = /* @__PURE__ */ new Date();
    const nextReview = new Date(card.nextReview);
    const diffTime = now.getTime() - nextReview.getTime();
    const diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }
};

// shared/levelingUtils.ts
var TITLE_TIERS = [
  {
    emoji: "\u{1F331}",
    titles: ["Listener", "Collector", "Quoter"],
    levelRange: [1, 10]
  },
  {
    emoji: "\u{1F50E}",
    titles: ["Interpreter", "Scholar", "Conversationalist"],
    levelRange: [11, 25]
  },
  {
    emoji: "\u{1F525}",
    titles: ["Orator", "Philosopher", "Sage"],
    levelRange: [26, 50]
  },
  {
    emoji: "\u{1F3C6}",
    titles: ["Luminary", "Master of Words", "Living Library"],
    levelRange: [51, 100]
  }
];
var XP_REQUIREMENTS = {
  TIER_1: { levels: [1, 10], xpPerLevel: 150 },
  // Levels 1-10: 150 XP each
  TIER_2: { levels: [11, 25], xpPerLevel: 250 },
  // Levels 11-25: 250 XP each  
  TIER_3: { levels: [26, 50], xpPerLevel: 400 },
  // Levels 26-50: 400 XP each
  TIER_4: { levels: [51, 100], xpPerLevel: 800 }
  // Levels 51-100: 800 XP each
};
var XP_REWARDS = {
  QUOTE_PRACTICED: 10,
  DAILY_GOAL_BONUS: 20,
  // When 10 quotes practiced in single day
  STREAK_3_DAYS: 30,
  STREAK_7_DAYS: 100
};
function getTotalXpForLevel(level) {
  if (level <= 1) return 0;
  let totalXp = 0;
  const tier1Levels = Math.min(level - 1, 10);
  totalXp += tier1Levels * XP_REQUIREMENTS.TIER_1.xpPerLevel;
  if (level <= 10) return totalXp;
  const tier2Levels = Math.min(level - 11, 15);
  totalXp += tier2Levels * XP_REQUIREMENTS.TIER_2.xpPerLevel;
  if (level <= 25) return totalXp;
  const tier3Levels = Math.min(level - 26, 25);
  totalXp += tier3Levels * XP_REQUIREMENTS.TIER_3.xpPerLevel;
  if (level <= 50) return totalXp;
  const tier4Levels = Math.min(level - 51, 50);
  totalXp += tier4Levels * XP_REQUIREMENTS.TIER_4.xpPerLevel;
  return totalXp;
}
function getLevelFromXp(xp) {
  if (xp <= 0) return 1;
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
  return Math.min(low, 100);
}
function getTitleForLevel(level) {
  const tier = TITLE_TIERS.find((t) => level >= t.levelRange[0] && level <= t.levelRange[1]);
  if (!tier) {
    return { title: "Living Library", emoji: "\u{1F3C6}" };
  }
  const levelInTier = level - tier.levelRange[0];
  const tierSize = tier.levelRange[1] - tier.levelRange[0] + 1;
  const titleIndex = Math.floor(levelInTier / tierSize * tier.titles.length);
  const clampedIndex = Math.min(titleIndex, tier.titles.length - 1);
  return {
    title: tier.titles[clampedIndex],
    emoji: tier.emoji
  };
}
function calculateLevelingInfo(xp) {
  const level = getLevelFromXp(xp);
  const { title, emoji } = getTitleForLevel(level);
  const currentLevelXp = getTotalXpForLevel(level);
  const nextLevelXp = level >= 100 ? currentLevelXp : getTotalXpForLevel(level + 1);
  const xpToNextLevel = level >= 100 ? 0 : nextLevelXp - xp;
  let levelProgress = 0;
  if (level < 100) {
    const xpInCurrentLevel = xp - currentLevelXp;
    const xpNeededForCurrentLevel = nextLevelXp - currentLevelXp;
    levelProgress = xpInCurrentLevel / xpNeededForCurrentLevel * 100;
  } else {
    levelProgress = 100;
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
function getStreakBonusXp(streak) {
  if (streak === 7) return XP_REWARDS.STREAK_7_DAYS;
  if (streak === 3) return XP_REWARDS.STREAK_3_DAYS;
  return 0;
}

// server/storage.ts
var DatabaseStorage = class {
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async createUser(userData) {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }
  async updateUserStats(userId, xpGain) {
    const user = await this.getUser(userId);
    if (!user) return;
    const newXp = (user.xp || 0) + xpGain;
    const levelingInfo = calculateLevelingInfo(newXp);
    const { title } = getTitleForLevel(levelingInfo.level);
    await db.update(users).set({
      xp: newXp,
      level: levelingInfo.level,
      title,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, userId));
  }
  async awardXpWithLeveling(userId, xpGain, reason) {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    const oldLevel = user.level || 1;
    const newXp = (user.xp || 0) + xpGain;
    const levelingInfo = calculateLevelingInfo(newXp);
    const { title } = getTitleForLevel(levelingInfo.level);
    const levelUp = levelingInfo.level > oldLevel;
    await db.update(users).set({
      xp: newXp,
      level: levelingInfo.level,
      title,
      dailyXp: sql2`${users.dailyXp} + ${xpGain}`,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, userId));
    return {
      levelUp,
      newLevel: levelingInfo.level,
      newXp
    };
  }
  async updateUserStreak(userId) {
    const user = await this.getUser(userId);
    if (!user) return;
    const now = /* @__PURE__ */ new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastStreakDate = user.lastStreakDate ? new Date(user.lastStreakDate) : null;
    const lastStreakDay = lastStreakDate ? new Date(lastStreakDate.getFullYear(), lastStreakDate.getMonth(), lastStreakDate.getDate()) : null;
    let newStreak = 1;
    if (lastStreakDay) {
      const daysDiff = Math.floor((today.getTime() - lastStreakDay.getTime()) / (1e3 * 60 * 60 * 24));
      if (daysDiff === 0) {
        return;
      } else if (daysDiff === 1) {
        newStreak = (user.streak || 0) + 1;
      } else {
        newStreak = 1;
      }
    }
    let bonusXp = 0;
    if (newStreak === 3 || newStreak === 7) {
      bonusXp = getStreakBonusXp(newStreak);
    }
    const updateData = {
      streak: newStreak,
      lastStreakDate: now,
      lastActiveDate: now,
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (bonusXp > 0) {
      updateData.xp = sql2`${users.xp} + ${bonusXp}`;
    }
    await db.update(users).set(updateData).where(eq(users.id, userId));
    if (bonusXp > 0) {
      const updatedUser = await this.getUser(userId);
      if (updatedUser) {
        const levelingInfo = calculateLevelingInfo(updatedUser.xp || 0);
        const { title } = getTitleForLevel(levelingInfo.level);
        await db.update(users).set({
          level: levelingInfo.level,
          title
        }).where(eq(users.id, userId));
      }
    }
  }
  async updateDailyProgress(userId) {
    const user = await this.getUser(userId);
    if (!user) return;
    const now = /* @__PURE__ */ new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
    const lastActiveDay = lastActive ? new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate()) : null;
    const isNewDay = !lastActiveDay || today.getTime() !== lastActiveDay.getTime();
    if (isNewDay) {
      await db.update(users).set({
        dailyXp: 0,
        dailyGoalCompleted: false,
        lastActiveDate: now,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(users.id, userId));
    }
    const updatedUser = await this.getUser(userId);
    if (updatedUser && !updatedUser.dailyGoalCompleted) {
      const dailyQuotesCount = Math.floor((updatedUser.dailyXp || 0) / XP_REWARDS.QUOTE_PRACTICED);
      if (dailyQuotesCount >= 10) {
        await this.awardXpWithLeveling(userId, XP_REWARDS.DAILY_GOAL_BONUS, "daily_goal_completed");
        await db.update(users).set({
          dailyGoalCompleted: true,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(users.id, userId));
      }
    }
  }
  async resetDailyProgress() {
    await db.update(users).set({
      dailyXp: 0,
      dailyGoalCompleted: false,
      updatedAt: /* @__PURE__ */ new Date()
    });
  }
  // Category operations
  async getCategories() {
    return await db.select().from(categories).orderBy(categories.name);
  }
  async createCategory(category) {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }
  // Quote operations
  async getQuotes() {
    return await db.select().from(quotes).orderBy(sql2`RANDOM()`);
  }
  async getQuotesByCategory(categoryId) {
    return await db.select().from(quotes).where(eq(quotes.categoryId, categoryId)).orderBy(sql2`RANDOM()`);
  }
  async getRandomQuote() {
    const [quote] = await db.select().from(quotes).orderBy(sql2`RANDOM()`).limit(1);
    return quote;
  }
  async createQuote(quote) {
    const [newQuote] = await db.insert(quotes).values(quote).returning();
    return newQuote;
  }
  // Favorites operations
  async getUserFavorites(userId) {
    return await db.select({
      id: favorites.id,
      userId: favorites.userId,
      quoteId: favorites.quoteId,
      createdAt: favorites.createdAt,
      quote: quotes,
      category: categories
    }).from(favorites).innerJoin(quotes, eq(favorites.quoteId, quotes.id)).innerJoin(categories, eq(quotes.categoryId, categories.id)).where(eq(favorites.userId, userId)).orderBy(desc(favorites.createdAt));
  }
  async addFavorite(favorite) {
    const [newFavorite] = await db.insert(favorites).values(favorite).returning();
    return newFavorite;
  }
  async removeFavorite(userId, quoteId) {
    await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.quoteId, quoteId)));
  }
  async isFavorite(userId, quoteId) {
    const [favorite] = await db.select().from(favorites).where(and(eq(favorites.userId, userId), eq(favorites.quoteId, quoteId)));
    return !!favorite;
  }
  // Progress operations
  async getUserProgress(userId) {
    return await db.select().from(userProgress).where(eq(userProgress.userId, userId));
  }
  async updateUserProgress(progress) {
    const existing = await this.getQuoteProgress(progress.userId, progress.quoteId);
    if (existing) {
      const [updated] = await db.update(userProgress).set({
        ...progress,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(and(
        eq(userProgress.userId, progress.userId),
        eq(userProgress.quoteId, progress.quoteId)
      )).returning();
      return updated;
    } else {
      const [newProgress] = await db.insert(userProgress).values(progress).returning();
      return newProgress;
    }
  }
  async getQuoteProgress(userId, quoteId) {
    const [progress] = await db.select().from(userProgress).where(and(eq(userProgress.userId, userId), eq(userProgress.quoteId, quoteId)));
    return progress;
  }
  // Quiz operations
  async createQuizSession(session2) {
    const [newSession] = await db.insert(quizSessions).values(session2).returning();
    return newSession;
  }
  async getUserQuizHistory(userId) {
    return await db.select().from(quizSessions).where(eq(quizSessions.userId, userId)).orderBy(desc(quizSessions.completedAt));
  }
  // Achievement operations
  async getAchievements() {
    return await db.select().from(achievements);
  }
  async createAchievement(achievement) {
    const [newAchievement] = await db.insert(achievements).values(achievement).returning();
    return newAchievement;
  }
  async getUserAchievements(userId) {
    return await db.select().from(userAchievements).where(eq(userAchievements.userId, userId)).orderBy(desc(userAchievements.unlockedAt));
  }
  async unlockAchievement(userAchievement) {
    const [achievement] = await db.insert(userAchievements).values(userAchievement).returning();
    return achievement;
  }
  // Stats operations
  async getUserStats(userId) {
    let user = await this.getUser(userId);
    if (!user) {
      return {
        totalXP: 0,
        level: 1,
        streak: 0,
        title: "Listener",
        dailyXp: 0,
        dailyGoalCompleted: false,
        xpToNextLevel: 100,
        levelProgress: 0,
        quotesLearned: 0,
        quizAccuracy: 0,
        favoritesCount: 0
      };
    }
    const now = /* @__PURE__ */ new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
    const lastActiveDay = lastActive ? new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate()) : null;
    const isNewDay = lastActiveDay && today.getTime() !== lastActiveDay.getTime();
    if (isNewDay) {
      await db.update(users).set({
        dailyXp: 0,
        dailyGoalCompleted: false,
        lastActiveDate: now,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(users.id, userId));
      user = await this.getUser(userId);
      if (!user) {
        return {
          totalXP: 0,
          level: 1,
          streak: 0,
          title: "Listener",
          dailyXp: 0,
          dailyGoalCompleted: false,
          xpToNextLevel: 100,
          levelProgress: 0,
          quotesLearned: 0,
          quizAccuracy: 0,
          favoritesCount: 0
        };
      }
    }
    const [favoritesCount] = await db.select({ count: count() }).from(favorites).where(eq(favorites.userId, userId));
    const [quotesLearned] = await db.select({ count: count() }).from(userProgress).where(and(eq(userProgress.userId, userId), sql2`${userProgress.masteryLevel} >= 5`));
    const [accuracyResult] = await db.select({
      accuracy: sql2`CASE WHEN SUM(${userProgress.totalAnswers}) > 0 THEN (SUM(${userProgress.correctAnswers})::float / SUM(${userProgress.totalAnswers})) * 100 ELSE 0 END`
    }).from(userProgress).where(eq(userProgress.userId, userId));
    const levelingInfo = calculateLevelingInfo(user.xp || 0);
    return {
      totalXP: user.xp || 0,
      level: user.level || 1,
      streak: user.streak || 0,
      title: user.title || levelingInfo.title,
      dailyXp: user.dailyXp || 0,
      dailyGoalCompleted: user.dailyGoalCompleted || false,
      xpToNextLevel: levelingInfo.xpToNextLevel,
      levelProgress: levelingInfo.levelProgress,
      quotesLearned: quotesLearned.count || 0,
      quizAccuracy: accuracyResult.accuracy || 0,
      favoritesCount: favoritesCount.count || 0
    };
  }
  // Spaced repetition operations
  async getCardsDueForReview(userId) {
    const now = /* @__PURE__ */ new Date();
    const progress = await db.select().from(userProgress).where(
      and(
        eq(userProgress.userId, userId),
        lte(userProgress.nextReview, now)
      )
    ).orderBy(userProgress.nextReview);
    return progress;
  }
  async updateProgressWithSpacedRepetition(userId, quoteId, result) {
    let [progress] = await db.select().from(userProgress).where(
      and(
        eq(userProgress.userId, userId),
        eq(userProgress.quoteId, quoteId)
      )
    );
    if (!progress) {
      [progress] = await db.insert(userProgress).values({
        userId,
        quoteId,
        masteryLevel: 0,
        timesStudied: 0,
        correctAnswers: 0,
        totalAnswers: 0,
        easeFactor: 2.5,
        interval: 1,
        nextReview: /* @__PURE__ */ new Date(),
        repetitions: 0,
        stage: "learning"
      }).returning();
    }
    const currentData = {
      easeFactor: progress.easeFactor || 2.5,
      interval: progress.interval || 1,
      nextReview: progress.nextReview || /* @__PURE__ */ new Date(),
      repetitions: progress.repetitions || 0,
      stage: progress.stage || "learning"
    };
    const newData = SpacedRepetitionEngine.calculateNextReview(currentData, result);
    let xpGain = 0;
    if (result.quality >= 3) {
      xpGain = result.quality === 5 ? 15 : result.quality === 4 ? 10 : 5;
    }
    const newCorrectAnswers = (progress.correctAnswers || 0) + (result.quality >= 3 ? 1 : 0);
    const newTotalAnswers = (progress.totalAnswers || 0) + 1;
    const currentMastery = progress.masteryLevel || 0;
    const newMasteryLevel = result.quality >= 4 ? Math.min(5, currentMastery + 1) : currentMastery;
    [progress] = await db.update(userProgress).set({
      masteryLevel: newMasteryLevel,
      timesStudied: (progress.timesStudied || 0) + 1,
      correctAnswers: newCorrectAnswers,
      totalAnswers: newTotalAnswers,
      lastStudied: /* @__PURE__ */ new Date(),
      easeFactor: newData.easeFactor,
      interval: newData.interval,
      nextReview: newData.nextReview,
      repetitions: newData.repetitions,
      stage: newData.stage,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(
      and(
        eq(userProgress.userId, userId),
        eq(userProgress.quoteId, quoteId)
      )
    ).returning();
    if (xpGain > 0) {
      await this.updateUserStats(userId, xpGain);
      await this.updateUserStreak(userId);
    }
    return progress;
  }
  async getStudyStats(userId) {
    const allProgress = await db.select().from(userProgress).where(eq(userProgress.userId, userId));
    return SpacedRepetitionEngine.calculateStudyStats(allProgress);
  }
  async getRecommendedStudySession(userId, userLevel) {
    const userFavorites = await db.select({
      quoteId: favorites.quoteId,
      quote: quotes
    }).from(favorites).innerJoin(quotes, eq(favorites.quoteId, quotes.id)).where(eq(favorites.userId, userId));
    for (const favorite of userFavorites) {
      const existingProgress = await db.select().from(userProgress).where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.quoteId, favorite.quoteId)
        )
      );
      if (existingProgress.length === 0) {
        await db.insert(userProgress).values({
          userId,
          quoteId: favorite.quoteId,
          masteryLevel: 0,
          timesStudied: 0,
          correctAnswers: 0,
          totalAnswers: 0,
          easeFactor: 2.5,
          interval: 1,
          nextReview: /* @__PURE__ */ new Date(),
          repetitions: 0,
          stage: "learning"
        });
      }
    }
    const dueCards = await db.select({
      id: userProgress.id,
      userId: userProgress.userId,
      quoteId: userProgress.quoteId,
      masteryLevel: userProgress.masteryLevel,
      timesStudied: userProgress.timesStudied,
      correctAnswers: userProgress.correctAnswers,
      totalAnswers: userProgress.totalAnswers,
      lastStudied: userProgress.lastStudied,
      easeFactor: userProgress.easeFactor,
      interval: userProgress.interval,
      nextReview: userProgress.nextReview,
      repetitions: userProgress.repetitions,
      stage: userProgress.stage,
      createdAt: userProgress.createdAt,
      updatedAt: userProgress.updatedAt,
      quote: quotes
    }).from(userProgress).innerJoin(quotes, eq(userProgress.quoteId, quotes.id)).where(
      and(
        eq(userProgress.userId, userId),
        lte(userProgress.nextReview, /* @__PURE__ */ new Date())
      )
    ).orderBy(userProgress.nextReview);
    const prioritizedCards = SpacedRepetitionEngine.prioritizeCards(dueCards);
    const sessionSize = SpacedRepetitionEngine.getRecommendedSessionSize(dueCards.length, userLevel);
    return prioritizedCards.slice(0, sessionSize);
  }
  // Email verification operations
  async createEmailVerificationToken(tokenData) {
    const [token] = await db.insert(emailVerificationTokens).values(tokenData).returning();
    return token;
  }
  async getEmailVerificationToken(token) {
    const [tokenRecord] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.token, token));
    return tokenRecord;
  }
  async deleteEmailVerificationToken(token) {
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.token, token));
  }
  async markEmailAsVerified(userId) {
    await db.update(users).set({ emailVerified: true }).where(eq(users.id, userId));
  }
  // Password reset operations
  async createPasswordResetToken(tokenData) {
    const [token] = await db.insert(passwordResetTokens).values(tokenData).returning();
    return token;
  }
  async getPasswordResetToken(token) {
    const [tokenRecord] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return tokenRecord;
  }
  async markPasswordResetTokenAsUsed(token) {
    await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.token, token));
  }
  async updateUserPassword(userId, hashedPassword) {
    await db.update(users).set({ password: hashedPassword, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, userId));
  }
};
var storage = new DatabaseStorage();

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import connectPg from "connect-pg-simple";

// server/email.ts
import { google } from "googleapis";
function getGmailClient() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}
function createEmailMessage(to, subject, body) {
  const emailLines = [
    `To: ${to}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${subject}`,
    "",
    body
  ];
  const email = emailLines.join("\r\n");
  return Buffer.from(email).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function sendVerificationEmail(to, username, verificationLink) {
  const gmail = getGmailClient();
  if (!gmail) {
    console.log(`[EMAIL] Verification link for ${to}: ${verificationLink}`);
    return;
  }
  const htmlBody = `
    <!DOCTYPE html><html><body>
    <h1>Welcome to QuoteLearn, ${username}!</h1>
    <p>Please verify your email address by clicking the link below:</p>
    <a href="${verificationLink}">Verify Email Address</a>
    <p>Or copy and paste: ${verificationLink}</p>
    <p>This link expires in 24 hours.</p>
    </body></html>
  `;
  const raw = createEmailMessage(to, "Verify your QuoteLearn account", htmlBody);
  await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
  console.log(`[EMAIL] Verification email sent to ${to}`);
}
async function sendPasswordResetEmail(to, username, resetLink) {
  const gmail = getGmailClient();
  if (!gmail) {
    console.log(`[EMAIL] Password reset link for ${to}: ${resetLink}`);
    return;
  }
  const htmlBody = `
    <!DOCTYPE html><html><body>
    <h1>Password Reset Request</h1>
    <p>Hello ${username},</p>
    <p>Click below to reset your password (expires in 1 hour):</p>
    <a href="${resetLink}">Reset Password</a>
    <p>Or copy and paste: ${resetLink}</p>
    </body></html>
  `;
  const raw = createEmailMessage(to, "Reset your QuoteLearn password", htmlBody);
  await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
  console.log(`[EMAIL] Password reset email sent to ${to}`);
}
async function sendPasswordResetConfirmationEmail(to, username) {
  const gmail = getGmailClient();
  if (!gmail) {
    console.log(`[EMAIL] Password changed confirmation for ${to}`);
    return;
  }
  const htmlBody = `
    <!DOCTYPE html><html><body>
    <h1>Password Successfully Changed</h1>
    <p>Hello ${username}, your QuoteLearn password was successfully changed.</p>
    <p>If you did not make this change, please contact support immediately.</p>
    </body></html>
  `;
  const raw = createEmailMessage(to, "QuoteLearn password changed", htmlBody);
  await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
  console.log(`[EMAIL] Password reset confirmation sent to ${to}`);
}

// server/auth.ts
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function generateSecureToken() {
  return randomBytes(48).toString("base64url");
}
function setupAuth(app2) {
  const PgStore = connectPg(session);
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "quotemee-fallback-secret-set-SESSION_SECRET-in-prod",
    resave: false,
    saveUninitialized: false,
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      tableName: "sessions",
      createTableIfMissing: true
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1e3
      // 24 hours
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`[AUTH] Attempting login for username: ${username}`);
        const user = await storage.getUserByUsername(username);
        console.log(`[AUTH] User found:`, user ? `Yes (id: ${user.id})` : "No");
        if (!user) {
          console.log(`[AUTH] Login failed: user not found`);
          return done(null, false);
        }
        console.log(`[AUTH] Checking password for user ${username}`);
        const passwordValid = await comparePasswords(password, user.password || "");
        console.log(`[AUTH] Password valid:`, passwordValid);
        if (!passwordValid) {
          console.log(`[AUTH] Login failed: invalid password`);
          return done(null, false);
        }
        console.log(`[AUTH] Login successful for user ${username}`);
        return done(null, {
          id: user.id,
          username: user.username ?? "",
          email: user.email ?? "",
          firstName: user.firstName || void 0,
          lastName: user.lastName || void 0
        });
      } catch (error) {
        console.error(`[AUTH] Login error:`, error);
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      if (user) {
        done(null, {
          id: user.id,
          username: user.username ?? "",
          email: user.email ?? "",
          firstName: user.firstName || void 0,
          lastName: user.lastName || void 0
        });
      } else {
        done(null, null);
      }
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      const { username, email, password, firstName, lastName } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        id: Date.now().toString(),
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        emailVerified: true
      });
      const token = generateSecureToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
      await storage.createEmailVerificationToken({
        userId: user.id,
        token,
        expiresAt
      });
      const baseUrl = process.env.APP_URL || `http://localhost:5000`;
      const verificationLink = `${baseUrl}/verify-email?token=${token}`;
      try {
        await sendVerificationEmail(email, username, verificationLink);
        console.log(`[AUTH] Verification email sent to ${email}`);
      } catch (emailError) {
        console.error("[AUTH] Failed to send verification email:", emailError);
      }
      req.login({ id: user.id, username: user.username ?? "", email: user.email ?? "", firstName: user.firstName || void 0, lastName: user.lastName || void 0 }, (err) => {
        if (err) return next(err);
        res.status(201).json({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName || void 0,
          lastName: user.lastName || void 0,
          emailVerified: true
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });
  app2.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName
    });
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName
    });
  });
}
function requireAuth(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// server/routes.ts
import { z } from "zod";
import { randomBytes as randomBytes2 } from "crypto";
async function registerRoutes(app2) {
  await setupAuth(app2);
  await seedInitialData();
  app2.get("/api/verify-email", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Invalid verification link" });
      }
      const tokenRecord = await storage.getEmailVerificationToken(token);
      if (!tokenRecord) {
        return res.status(400).json({ message: "Invalid or expired verification link" });
      }
      if (/* @__PURE__ */ new Date() > tokenRecord.expiresAt) {
        await storage.deleteEmailVerificationToken(token);
        return res.status(400).json({ message: "Verification link has expired" });
      }
      await storage.markEmailAsVerified(tokenRecord.userId);
      await storage.deleteEmailVerificationToken(token);
      res.json({ message: "Email verified successfully!" });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });
  app2.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const user = await storage.getUserByEmail(email);
      if (user) {
        const token = randomBytes2(48).toString("base64url");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1e3);
        await storage.createPasswordResetToken({
          userId: user.id,
          token,
          used: false,
          expiresAt
        });
        const baseUrl = process.env.APP_URL || `http://localhost:5000`;
        const resetLink = `${baseUrl}/reset-password?token=${token}`;
        try {
          await sendPasswordResetEmail(user.email, user.username, resetLink);
          console.log(`[AUTH] Password reset email sent to ${user.email}`);
        } catch (emailError) {
          console.error("[AUTH] Failed to send password reset email:", emailError);
        }
      }
      res.json({ message: "If an account exists with that email, you will receive a password reset link shortly." });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });
  app2.get("/api/validate-reset-token", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ valid: false, message: "Invalid token" });
      }
      const tokenRecord = await storage.getPasswordResetToken(token);
      if (!tokenRecord) {
        return res.status(400).json({ valid: false, message: "Invalid or expired reset link" });
      }
      if (tokenRecord.used) {
        return res.status(400).json({ valid: false, message: "This reset link has already been used" });
      }
      if (/* @__PURE__ */ new Date() > tokenRecord.expiresAt) {
        return res.status(400).json({ valid: false, message: "Reset link has expired" });
      }
      res.json({ valid: true });
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(500).json({ valid: false, message: "Failed to validate token" });
    }
  });
  app2.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }
      const tokenRecord = await storage.getPasswordResetToken(token);
      if (!tokenRecord) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }
      if (tokenRecord.used) {
        return res.status(400).json({ message: "This reset link has already been used" });
      }
      if (/* @__PURE__ */ new Date() > tokenRecord.expiresAt) {
        return res.status(400).json({ message: "Reset link has expired" });
      }
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(tokenRecord.userId, hashedPassword);
      await storage.markPasswordResetTokenAsUsed(token);
      const user = await storage.getUser(tokenRecord.userId);
      if (user) {
        try {
          await sendPasswordResetConfirmationEmail(user.email, user.username);
        } catch (emailError) {
          console.error("[AUTH] Failed to send password reset confirmation:", emailError);
        }
      }
      res.json({ message: "Password reset successfully! You can now log in with your new password." });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
  app2.get("/api/categories", async (req, res) => {
    try {
      const categories2 = await storage.getCategories();
      res.json(categories2);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });
  app2.post("/api/categories", async (req, res) => {
    try {
      const validatedCategory = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedCategory);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid category data", errors: error.errors });
      } else {
        console.error("Error creating category:", error);
        res.status(500).json({ message: "Failed to create category" });
      }
    }
  });
  app2.get("/api/quotes", async (req, res) => {
    try {
      const categoryId = req.query.categoryId;
      let quotes2;
      if (categoryId && !isNaN(parseInt(categoryId))) {
        quotes2 = await storage.getQuotesByCategory(parseInt(categoryId));
      } else {
        quotes2 = await storage.getQuotes();
      }
      res.json(quotes2);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });
  app2.get("/api/quotes/category/:categoryId", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const quotes2 = await storage.getQuotesByCategory(categoryId);
      res.json(quotes2);
    } catch (error) {
      console.error("Error fetching quotes by category:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });
  app2.get("/api/quotes/random", async (req, res) => {
    try {
      const quote = await storage.getRandomQuote();
      res.json(quote);
    } catch (error) {
      console.error("Error fetching random quote:", error);
      res.status(500).json({ message: "Failed to fetch random quote" });
    }
  });
  app2.post("/api/quotes", async (req, res) => {
    try {
      const validatedQuote = insertQuoteSchema.parse(req.body);
      const quote = await storage.createQuote(validatedQuote);
      res.status(201).json(quote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid quote data", errors: error.errors });
      } else {
        console.error("Error creating quote:", error);
        res.status(500).json({ message: "Failed to create quote" });
      }
    }
  });
  app2.get("/api/favorites", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const favorites2 = await storage.getUserFavorites(userId);
      res.json(favorites2);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });
  app2.post("/api/favorites", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const validatedFavorite = insertFavoriteSchema.parse({
        ...req.body,
        userId
      });
      const favorite = await storage.addFavorite(validatedFavorite);
      const levelingResult = await storage.awardXpWithLeveling(userId, 5, "quote_favorited");
      res.status(201).json({
        ...favorite,
        xpGained: 5,
        levelUp: levelingResult.levelUp,
        newLevel: levelingResult.newLevel,
        newXp: levelingResult.newXp
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid favorite data", errors: error.errors });
      } else {
        console.error("Error adding favorite:", error);
        res.status(500).json({ message: "Failed to add favorite" });
      }
    }
  });
  app2.delete("/api/favorites/:quoteId", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const quoteId = parseInt(req.params.quoteId);
      await storage.removeFavorite(userId, quoteId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });
  app2.get("/api/favorites/:quoteId/check", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const quoteId = parseInt(req.params.quoteId);
      const isFavorite = await storage.isFavorite(userId, quoteId);
      res.json({ isFavorite });
    } catch (error) {
      console.error("Error checking favorite status:", error);
      res.status(500).json({ message: "Failed to check favorite status" });
    }
  });
  app2.get("/api/progress", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });
  app2.post("/api/progress", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const validatedProgress = insertUserProgressSchema.parse({
        ...req.body,
        userId
      });
      const progress = await storage.updateUserProgress(validatedProgress);
      await storage.updateDailyProgress(userId);
      res.json(progress);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid progress data", errors: error.errors });
      } else {
        console.error("Error updating progress:", error);
        res.status(500).json({ message: "Failed to update progress" });
      }
    }
  });
  app2.post("/api/quiz/session", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const sessionData = insertQuizSessionSchema.parse({
        ...req.body,
        userId
      });
      const session2 = await storage.createQuizSession(sessionData);
      const levelingResult = await storage.awardXpWithLeveling(userId, sessionData.xpEarned || 0, "quiz_completed");
      await storage.updateUserStreak(userId);
      res.json({
        ...session2,
        levelUp: levelingResult.levelUp,
        newLevel: levelingResult.newLevel,
        newXp: levelingResult.newXp
      });
    } catch (error) {
      console.error("Error creating quiz session:", error);
      res.status(500).json({ message: "Failed to create quiz session" });
    }
  });
  app2.get("/api/quiz/history", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const history = await storage.getUserQuizHistory(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching quiz history:", error);
      res.status(500).json({ message: "Failed to fetch quiz history" });
    }
  });
  app2.get("/api/user/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });
  app2.get("/api/achievements", async (req, res) => {
    try {
      const achievements2 = await storage.getAchievements();
      res.json(achievements2);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });
  app2.get("/api/achievements/user", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const userAchievements2 = await storage.getUserAchievements(userId);
      res.json(userAchievements2);
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      res.status(500).json({ message: "Failed to fetch user achievements" });
    }
  });
  app2.get("/api/study/cards", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const cards = await storage.getCardsDueForReview(userId);
      res.json(cards);
    } catch (error) {
      console.error("Error fetching study cards:", error);
      res.status(500).json({ message: "Failed to fetch study cards" });
    }
  });
  app2.get("/api/study/session", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const userStats = await storage.getUserStats(userId);
      const cards = await storage.getRecommendedStudySession(userId, userStats.level);
      res.json(cards);
    } catch (error) {
      console.error("Error fetching study session:", error);
      res.status(500).json({ message: "Failed to fetch study session" });
    }
  });
  app2.post("/api/study/review", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const { quoteId, quality, responseTime } = req.body;
      const result = { quality: parseInt(quality), responseTime };
      const updatedProgress = await storage.updateProgressWithSpacedRepetition(userId, quoteId, result);
      const xpGain = 10;
      const levelingResult = await storage.awardXpWithLeveling(userId, xpGain, "spaced_repetition_review");
      await storage.updateDailyProgress(userId);
      await storage.updateUserStreak(userId);
      res.json({
        ...updatedProgress,
        xpGained: xpGain,
        levelUp: levelingResult?.levelUp || false,
        newLevel: levelingResult?.newLevel,
        newXp: levelingResult?.newXp
      });
    } catch (error) {
      console.error("Error updating review:", error);
      res.status(500).json({ message: "Failed to update review" });
    }
  });
  app2.get("/api/study/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getStudyStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching study stats:", error);
      res.status(500).json({ message: "Failed to fetch study stats" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}
async function seedInitialData() {
  try {
    const adminUser = await storage.getUserByUsername("Admin");
    if (!adminUser) {
      const adminPassword = await hashPassword(process.env.ADMIN_PASSWORD || "changeme-" + Math.random().toString(36).slice(2));
      await storage.createUser({
        id: "admin-" + Date.now().toString(),
        username: "Admin",
        email: process.env.ADMIN_EMAIL || "admin@quotelearn.com",
        password: adminPassword,
        firstName: "Admin",
        lastName: "User",
        emailVerified: true
      });
      console.log("Admin user created (username: Admin)");
    }
    let existingCategories = await storage.getCategories();
    let categoryMap = {};
    if (existingCategories.length === 0) {
      const categories2 = await Promise.all([
        storage.createCategory({
          name: "Love",
          icon: "fas fa-heart",
          color: "from-pink-400 to-pink-600",
          description: "Quotes about love, relationships, and romance"
        }),
        storage.createCategory({
          name: "Science",
          icon: "fas fa-flask",
          color: "from-blue-400 to-blue-600",
          description: "Quotes about science, discovery, and knowledge"
        }),
        storage.createCategory({
          name: "History",
          icon: "fas fa-landmark",
          color: "from-amber-400 to-amber-600",
          description: "Quotes from historical figures and about history"
        }),
        storage.createCategory({
          name: "Finance",
          icon: "fas fa-dollar-sign",
          color: "from-green-400 to-green-600",
          description: "Quotes about money, investing, and financial wisdom"
        })
      ]);
      categories2.forEach((cat) => {
        categoryMap[cat.name] = cat.id;
      });
      console.log("Categories created successfully");
    } else {
      existingCategories.forEach((cat) => {
        categoryMap[cat.name] = cat.id;
      });
    }
    console.log("Quote seeding is disabled - quotes have been intentionally removed");
    const existingAchievements = await storage.getAchievements();
    if (existingAchievements.length === 0) {
      const defaultAchievements = [
        {
          name: "First Steps",
          description: "Complete your first quote practice session",
          icon: "fas fa-baby",
          xpReward: 10
        },
        {
          name: "Quote Collector",
          description: "Add 10 quotes to your favorites",
          icon: "fas fa-heart",
          xpReward: 25
        },
        {
          name: "Learning Streak",
          description: "Maintain a 7-day learning streak",
          icon: "fas fa-fire",
          xpReward: 50
        },
        {
          name: "Quote Master",
          description: "Study 100 quotes successfully",
          icon: "fas fa-graduation-cap",
          xpReward: 100
        }
      ];
      for (const achievement of defaultAchievements) {
        await storage.createAchievement(achievement);
      }
      console.log("Default achievements created");
    }
    console.log("Database seeding completed successfully");
  } catch (error) {
    console.error("Error seeding initial data:", error);
  }
}

// server/handler.ts
var app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
var distPublic = path.join(process.cwd(), "dist", "public");
if (fs.existsSync(distPublic)) {
  app.use(express.static(distPublic));
}
var ready = (async () => {
  await registerRoutes(app);
  app.use("*", (_req, res) => {
    res.sendFile(path.join(distPublic, "index.html"));
  });
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });
})();
async function handler(req, res) {
  await ready;
  return app(req, res);
}
export {
  handler as default
};
