import {
  users,
  quotes,
  categories,
  favorites,
  userProgress,
  quizSessions,
  achievements,
  userAchievements,
  emailVerificationTokens,
  passwordResetTokens,
  type User,
  type UpsertUser,
  type Quote,
  type Category,
  type Favorite,
  type UserProgress,
  type QuizSession,
  type Achievement,
  type UserAchievement,
  type EmailVerificationToken,
  type PasswordResetToken,
  type InsertQuote,
  type InsertCategory,
  type InsertFavorite,
  type InsertUserProgress,
  type InsertQuizSession,
  type InsertAchievement,
  type InsertUserAchievement,
  type InsertEmailVerificationToken,
  type InsertPasswordResetToken,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count, avg, lte } from "drizzle-orm";
import { SpacedRepetitionEngine, type SpacedRepetitionData, type ReviewResult } from "./spacedRepetition";
import { calculateLevelingInfo, getTitleForLevel, XP_REWARDS, getStreakBonusXp, getDailyGoalBonusXp } from "@shared/levelingUtils";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUserStats(userId: string, xpGain: number): Promise<void>;
  updateUserStreak(userId: string): Promise<void>;
  awardXpWithLeveling(userId: string, xpGain: number, reason: string): Promise<{ levelUp: boolean; newLevel: number; newXp: number }>;
  updateDailyProgress(userId: string): Promise<void>;
  resetDailyProgress(): Promise<void>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Quote operations
  getQuotes(): Promise<Quote[]>;
  getQuotesByCategory(categoryId: number): Promise<Quote[]>;
  getRandomQuote(): Promise<Quote | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  
  // Favorites operations
  getUserFavorites(userId: string): Promise<(Favorite & { quote: Quote; category: Category })[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: string, quoteId: number): Promise<void>;
  isFavorite(userId: string, quoteId: number): Promise<boolean>;
  
  // Progress operations
  getUserProgress(userId: string): Promise<UserProgress[]>;
  updateUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  getQuoteProgress(userId: string, quoteId: number): Promise<UserProgress | undefined>;
  
  // Quiz operations
  createQuizSession(session: InsertQuizSession): Promise<QuizSession>;
  getUserQuizHistory(userId: string): Promise<QuizSession[]>;
  
  // Achievement operations
  getAchievements(): Promise<Achievement[]>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  getUserAchievements(userId: string): Promise<UserAchievement[]>;
  unlockAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement>;
  
  // Stats operations
  getUserStats(userId: string): Promise<{
    totalXP: number;
    level: number;
    streak: number;
    title: string;
    dailyXp: number;
    dailyGoalCompleted: boolean;
    xpToNextLevel: number;
    levelProgress: number;
    quotesLearned: number;
    quizAccuracy: number;
    favoritesCount: number;
  }>;

  // Spaced repetition operations
  getCardsDueForReview(userId: string): Promise<UserProgress[]>;
  updateProgressWithSpacedRepetition(userId: string, quoteId: number, result: ReviewResult): Promise<UserProgress>;
  getStudyStats(userId: string): Promise<{
    totalCards: number;
    dueToday: number;
    learning: number;
    review: number;
    mastered: number;
    averageEase: number;
  }>;
  getRecommendedStudySession(userId: string, userLevel: number): Promise<UserProgress[]>;

  // Email verification operations
  createEmailVerificationToken(token: InsertEmailVerificationToken): Promise<EmailVerificationToken>;
  getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined>;
  deleteEmailVerificationToken(token: string): Promise<void>;
  markEmailAsVerified(userId: string): Promise<void>;

  // Password reset operations
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenAsUsed(token: string): Promise<void>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUserStats(userId: string, xpGain: number): Promise<void> {
    // Legacy method - use awardXpWithLeveling for full leveling system support
    const user = await this.getUser(userId);
    if (!user) return;

    const newXp = (user.xp || 0) + xpGain;
    const levelingInfo = calculateLevelingInfo(newXp);
    const { title } = getTitleForLevel(levelingInfo.level);

    await db
      .update(users)
      .set({
        xp: newXp,
        level: levelingInfo.level,
        title: title,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async awardXpWithLeveling(userId: string, xpGain: number, reason: string): Promise<{ levelUp: boolean; newLevel: number; newXp: number }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    const oldLevel = user.level || 1;
    const newXp = (user.xp || 0) + xpGain;
    const levelingInfo = calculateLevelingInfo(newXp);
    const { title } = getTitleForLevel(levelingInfo.level);
    const levelUp = levelingInfo.level > oldLevel;

    await db
      .update(users)
      .set({
        xp: newXp,
        level: levelingInfo.level,
        title: title,
        dailyXp: sql`${users.dailyXp} + ${xpGain}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return {
      levelUp,
      newLevel: levelingInfo.level,
      newXp
    };
  }

  async updateUserStreak(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastStreakDate = user.lastStreakDate ? new Date(user.lastStreakDate) : null;
    const lastStreakDay = lastStreakDate ? new Date(lastStreakDate.getFullYear(), lastStreakDate.getMonth(), lastStreakDate.getDate()) : null;

    let newStreak = 1;
    
    if (lastStreakDay) {
      const daysDiff = Math.floor((today.getTime() - lastStreakDay.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 0) {
        // Same day, don't update streak
        return;
      } else if (daysDiff === 1) {
        // Consecutive day, increment streak
        newStreak = (user.streak || 0) + 1;
      } else {
        // Missed days, reset streak
        newStreak = 1;
      }
    }

    // Check for streak bonuses
    let bonusXp = 0;
    if (newStreak === 3 || newStreak === 7) {
      bonusXp = getStreakBonusXp(newStreak);
    }

    const updateData: any = {
      streak: newStreak,
      lastStreakDate: now,
      lastActiveDate: now,
      updatedAt: new Date(),
    };

    if (bonusXp > 0) {
      updateData.xp = sql`${users.xp} + ${bonusXp}`;
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    // Update level if bonus XP was awarded
    if (bonusXp > 0) {
      const updatedUser = await this.getUser(userId);
      if (updatedUser) {
        const levelingInfo = calculateLevelingInfo(updatedUser.xp || 0);
        const { title } = getTitleForLevel(levelingInfo.level);
        
        await db
          .update(users)
          .set({
            level: levelingInfo.level,
            title: title,
          })
          .where(eq(users.id, userId));
      }
    }
  }

  async updateDailyProgress(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    // Check if we need to reset daily progress (new day)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
    const lastActiveDay = lastActive ? new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate()) : null;

    const isNewDay = !lastActiveDay || today.getTime() !== lastActiveDay.getTime();

    if (isNewDay) {
      await db
        .update(users)
        .set({
          dailyXp: 0,
          dailyGoalCompleted: false,
          lastActiveDate: now,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    // Check if daily goal is completed (10 quotes)
    const updatedUser = await this.getUser(userId);
    if (updatedUser && !updatedUser.dailyGoalCompleted) {
      const dailyQuotesCount = Math.floor((updatedUser.dailyXp || 0) / XP_REWARDS.QUOTE_PRACTICED);
      
      if (dailyQuotesCount >= 10) {
        // Award daily goal bonus
        await this.awardXpWithLeveling(userId, XP_REWARDS.DAILY_GOAL_BONUS, 'daily_goal_completed');
        
        await db
          .update(users)
          .set({
            dailyGoalCompleted: true,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      }
    }
  }

  async resetDailyProgress(): Promise<void> {
    // Reset daily progress for all users (run at midnight)
    await db
      .update(users)
      .set({
        dailyXp: 0,
        dailyGoalCompleted: false,
        updatedAt: new Date(),
      });
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  // Quote operations
  async getQuotes(): Promise<Quote[]> {
    // Shuffle all quotes when viewing "All" category so users get variety
    return await db.select().from(quotes).orderBy(sql`RANDOM()`);
  }

  async getQuotesByCategory(categoryId: number): Promise<Quote[]> {
    // Shuffle quotes so users see variety each time they visit
    return await db.select().from(quotes).where(eq(quotes.categoryId, categoryId)).orderBy(sql`RANDOM()`);
  }

  async getRandomQuote(): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).orderBy(sql`RANDOM()`).limit(1);
    return quote;
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const [newQuote] = await db.insert(quotes).values(quote).returning();
    return newQuote;
  }

  // Favorites operations
  async getUserFavorites(userId: string): Promise<(Favorite & { quote: Quote; category: Category })[]> {
    return await db
      .select({
        id: favorites.id,
        userId: favorites.userId,
        quoteId: favorites.quoteId,
        createdAt: favorites.createdAt,
        quote: quotes,
        category: categories,
      })
      .from(favorites)
      .innerJoin(quotes, eq(favorites.quoteId, quotes.id))
      .innerJoin(categories, eq(quotes.categoryId, categories.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));
  }

  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    const [newFavorite] = await db.insert(favorites).values(favorite).returning();
    return newFavorite;
  }

  async removeFavorite(userId: string, quoteId: number): Promise<void> {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.quoteId, quoteId)));
  }

  async isFavorite(userId: string, quoteId: number): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.quoteId, quoteId)));
    return !!favorite;
  }

  // Progress operations
  async getUserProgress(userId: string): Promise<UserProgress[]> {
    return await db.select().from(userProgress).where(eq(userProgress.userId, userId));
  }

  async updateUserProgress(progress: InsertUserProgress): Promise<UserProgress> {
    const existing = await this.getQuoteProgress(progress.userId, progress.quoteId);
    
    if (existing) {
      const [updated] = await db
        .update(userProgress)
        .set({
          ...progress,
          updatedAt: new Date(),
        })
        .where(and(
          eq(userProgress.userId, progress.userId),
          eq(userProgress.quoteId, progress.quoteId)
        ))
        .returning();
      return updated;
    } else {
      const [newProgress] = await db.insert(userProgress).values(progress).returning();
      return newProgress;
    }
  }

  async getQuoteProgress(userId: string, quoteId: number): Promise<UserProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(and(eq(userProgress.userId, userId), eq(userProgress.quoteId, quoteId)));
    return progress;
  }

  // Quiz operations
  async createQuizSession(session: InsertQuizSession): Promise<QuizSession> {
    const [newSession] = await db.insert(quizSessions).values(session).returning();
    return newSession;
  }

  async getUserQuizHistory(userId: string): Promise<QuizSession[]> {
    return await db
      .select()
      .from(quizSessions)
      .where(eq(quizSessions.userId, userId))
      .orderBy(desc(quizSessions.completedAt));
  }

  // Achievement operations
  async getAchievements(): Promise<Achievement[]> {
    return await db.select().from(achievements);
  }

  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const [newAchievement] = await db
      .insert(achievements)
      .values(achievement)
      .returning();
    return newAchievement;
  }

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    return await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.unlockedAt));
  }

  async unlockAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement> {
    const [achievement] = await db.insert(userAchievements).values(userAchievement).returning();
    return achievement;
  }

  // Stats operations
  async getUserStats(userId: string): Promise<{
    totalXP: number;
    level: number;
    streak: number;
    title: string;
    dailyXp: number;
    dailyGoalCompleted: boolean;
    xpToNextLevel: number;
    levelProgress: number;
    quotesLearned: number;
    quizAccuracy: number;
    favoritesCount: number;
  }> {
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
        favoritesCount: 0,
      };
    }

    // Check if we need to reset daily progress (new day)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
    const lastActiveDay = lastActive ? new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate()) : null;

    const isNewDay = lastActiveDay && today.getTime() !== lastActiveDay.getTime();

    if (isNewDay) {
      // Reset daily progress for new day
      await db
        .update(users)
        .set({
          dailyXp: 0,
          dailyGoalCompleted: false,
          lastActiveDate: now,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
      
      // Refresh user data after reset
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
          favoritesCount: 0,
        };
      }
    }

    const [favoritesCount] = await db
      .select({ count: count() })
      .from(favorites)
      .where(eq(favorites.userId, userId));

    const [quotesLearned] = await db
      .select({ count: count() })
      .from(userProgress)
      .where(and(eq(userProgress.userId, userId), sql`${userProgress.masteryLevel} >= 5`));

    const [accuracyResult] = await db
      .select({ 
        accuracy: sql<number>`CASE WHEN SUM(${userProgress.totalAnswers}) > 0 THEN (SUM(${userProgress.correctAnswers})::float / SUM(${userProgress.totalAnswers})) * 100 ELSE 0 END` 
      })
      .from(userProgress)
      .where(eq(userProgress.userId, userId));

    // Calculate leveling information
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
      favoritesCount: favoritesCount.count || 0,
    };
  }

  // Spaced repetition operations
  async getCardsDueForReview(userId: string): Promise<UserProgress[]> {
    const now = new Date();
    const progress = await db
      .select()
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, userId),
          lte(userProgress.nextReview, now)
        )
      )
      .orderBy(userProgress.nextReview);

    return progress;
  }

  async updateProgressWithSpacedRepetition(
    userId: string, 
    quoteId: number, 
    result: ReviewResult
  ): Promise<UserProgress> {
    // Get existing progress or create new
    let [progress] = await db
      .select()
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.quoteId, quoteId)
        )
      );

    if (!progress) {
      // Create new progress entry
      [progress] = await db
        .insert(userProgress)
        .values({
          userId,
          quoteId,
          masteryLevel: 0,
          timesStudied: 0,
          correctAnswers: 0,
          totalAnswers: 0,
          easeFactor: 2.5,
          interval: 1,
          nextReview: new Date(),
          repetitions: 0,
          stage: 'learning'
        })
        .returning();
    }

    // Calculate new spaced repetition data
    const currentData: SpacedRepetitionData = {
      easeFactor: progress.easeFactor || 2.5,
      interval: progress.interval || 1,
      nextReview: progress.nextReview || new Date(),
      repetitions: progress.repetitions || 0,
      stage: (progress.stage as any) || 'learning'
    };

    const newData = SpacedRepetitionEngine.calculateNextReview(currentData, result);

    // Calculate XP based on performance
    let xpGain = 0;
    if (result.quality >= 3) { // Good or Easy
      xpGain = result.quality === 5 ? 15 : result.quality === 4 ? 10 : 5;
    }

    // Update progress with new data
    const newCorrectAnswers = (progress.correctAnswers || 0) + (result.quality >= 3 ? 1 : 0);
    const newTotalAnswers = (progress.totalAnswers || 0) + 1;
    // Mastery increases by 1 for each "Adept" (4) or "Master" (5) rating, up to 5
    // A quote is "mastered" after 5 such ratings
    const currentMastery = progress.masteryLevel || 0;
    const newMasteryLevel = result.quality >= 4 ? Math.min(5, currentMastery + 1) : currentMastery;

    [progress] = await db
      .update(userProgress)
      .set({
        masteryLevel: newMasteryLevel,
        timesStudied: (progress.timesStudied || 0) + 1,
        correctAnswers: newCorrectAnswers,
        totalAnswers: newTotalAnswers,
        lastStudied: new Date(),
        easeFactor: newData.easeFactor,
        interval: newData.interval,
        nextReview: newData.nextReview,
        repetitions: newData.repetitions,
        stage: newData.stage,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.quoteId, quoteId)
        )
      )
      .returning();

    // Update user stats with XP gain and streak
    if (xpGain > 0) {
      await this.updateUserStats(userId, xpGain);
      await this.updateUserStreak(userId);
    }

    return progress;
  }

  async getStudyStats(userId: string): Promise<{
    totalCards: number;
    dueToday: number;
    learning: number;
    review: number;
    mastered: number;
    averageEase: number;
  }> {
    const allProgress = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId));

    return SpacedRepetitionEngine.calculateStudyStats(allProgress);
  }

  async getRecommendedStudySession(userId: string, userLevel: number): Promise<UserProgress[]> {
    // Get user's favorited quotes for study
    const userFavorites = await db
      .select({
        quoteId: favorites.quoteId,
        quote: quotes
      })
      .from(favorites)
      .innerJoin(quotes, eq(favorites.quoteId, quotes.id))
      .where(eq(favorites.userId, userId));

    // Create progress entries for favorited quotes if they don't exist
    for (const favorite of userFavorites) {
      const existingProgress = await db
        .select()
        .from(userProgress)
        .where(
          and(
            eq(userProgress.userId, userId),
            eq(userProgress.quoteId, favorite.quoteId)
          )
        );

      if (existingProgress.length === 0) {
        await db
          .insert(userProgress)
          .values({
            userId,
            quoteId: favorite.quoteId,
            masteryLevel: 0,
            timesStudied: 0,
            correctAnswers: 0,
            totalAnswers: 0,
            easeFactor: 2.5,
            interval: 1,
            nextReview: new Date(),
            repetitions: 0,
            stage: 'learning'
          });
      }
    }

    // Get all cards due for review
    const dueCards = await db
      .select({
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
      })
      .from(userProgress)
      .innerJoin(quotes, eq(userProgress.quoteId, quotes.id))
      .where(
        and(
          eq(userProgress.userId, userId),
          lte(userProgress.nextReview, new Date())
        )
      )
      .orderBy(userProgress.nextReview);

    const prioritizedCards = SpacedRepetitionEngine.prioritizeCards(dueCards);
    const sessionSize = SpacedRepetitionEngine.getRecommendedSessionSize(dueCards.length, userLevel);
    
    return prioritizedCards.slice(0, sessionSize);
  }

  // Email verification operations
  async createEmailVerificationToken(tokenData: InsertEmailVerificationToken): Promise<EmailVerificationToken> {
    const [token] = await db
      .insert(emailVerificationTokens)
      .values(tokenData)
      .returning();
    return token;
  }

  async getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined> {
    const [tokenRecord] = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));
    return tokenRecord;
  }

  async deleteEmailVerificationToken(token: string): Promise<void> {
    await db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));
  }

  async markEmailAsVerified(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, userId));
  }

  // Password reset operations
  async createPasswordResetToken(tokenData: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [token] = await db
      .insert(passwordResetTokens)
      .values(tokenData)
      .returning();
    return token;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [tokenRecord] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return tokenRecord;
  }

  async markPasswordResetTokenAsUsed(token: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
