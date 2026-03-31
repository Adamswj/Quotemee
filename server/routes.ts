import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, hashPassword } from "./auth";
import { allNewQuotes } from "./seedData";
import { 
  insertQuoteSchema, 
  insertCategorySchema, 
  insertFavoriteSchema,
  insertUserProgressSchema,
  insertQuizSessionSchema,
  insertAchievementSchema,
  achievements as achievementsTable
} from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { sendPasswordResetEmail, sendPasswordResetConfirmationEmail } from "./email";
import { randomBytes } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Seed initial data
  await seedInitialData();

  // Auth routes - now using traditional authentication

  // Email verification route
  app.get('/api/verify-email', async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Invalid verification link" });
      }

      const tokenRecord = await storage.getEmailVerificationToken(token);

      if (!tokenRecord) {
        return res.status(400).json({ message: "Invalid or expired verification link" });
      }

      if (new Date() > tokenRecord.expiresAt) {
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

  // Password reset request
  app.post('/api/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Always return success to prevent user enumeration
      const user = await storage.getUserByEmail(email);
      
      if (user) {
        const token = randomBytes(48).toString('base64url');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await storage.createPasswordResetToken({
          userId: user.id,
          token,
          used: false,
          expiresAt,
        });

        // Use stable APP_URL for published app
        const baseUrl = process.env.APP_URL || `http://localhost:5000`;
        const resetLink = `${baseUrl}/reset-password?token=${token}`;

        try {
          await sendPasswordResetEmail(user.email!, user.username!, resetLink);
          console.log(`[AUTH] Password reset email sent to ${user.email}`);
        } catch (emailError) {
          console.error('[AUTH] Failed to send password reset email:', emailError);
        }
      }

      // Always return success message to prevent user enumeration
      res.json({ message: "If an account exists with that email, you will receive a password reset link shortly." });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Validate password reset token
  app.get('/api/validate-reset-token', async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ valid: false, message: "Invalid token" });
      }

      const tokenRecord = await storage.getPasswordResetToken(token);

      if (!tokenRecord) {
        return res.status(400).json({ valid: false, message: "Invalid or expired reset link" });
      }

      if (tokenRecord.used) {
        return res.status(400).json({ valid: false, message: "This reset link has already been used" });
      }

      if (new Date() > tokenRecord.expiresAt) {
        return res.status(400).json({ valid: false, message: "Reset link has expired" });
      }

      res.json({ valid: true });
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(500).json({ valid: false, message: "Failed to validate token" });
    }
  });

  // Reset password
  app.post('/api/reset-password', async (req, res) => {
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

      if (new Date() > tokenRecord.expiresAt) {
        return res.status(400).json({ message: "Reset link has expired" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(tokenRecord.userId, hashedPassword);
      await storage.markPasswordResetTokenAsUsed(token);

      const user = await storage.getUser(tokenRecord.userId);
      if (user) {
        try {
          await sendPasswordResetConfirmationEmail(user.email!, user.username!);
        } catch (emailError) {
          console.error('[AUTH] Failed to send password reset confirmation:', emailError);
        }
      }

      res.json({ message: "Password reset successfully! You can now log in with your new password." });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Categories routes
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/categories', async (req, res) => {
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

  // Quotes routes
  app.get('/api/quotes', async (req, res) => {
    try {
      const categoryId = req.query.categoryId;
      let quotes;
      
      if (categoryId && !isNaN(parseInt(categoryId as string))) {
        quotes = await storage.getQuotesByCategory(parseInt(categoryId as string));
      } else {
        quotes = await storage.getQuotes();
      }
      
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.get('/api/quotes/category/:categoryId', async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const quotes = await storage.getQuotesByCategory(categoryId);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quotes by category:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.get('/api/quotes/random', async (req, res) => {
    try {
      const quote = await storage.getRandomQuote();
      res.json(quote);
    } catch (error) {
      console.error("Error fetching random quote:", error);
      res.status(500).json({ message: "Failed to fetch random quote" });
    }
  });

  app.post('/api/quotes', async (req, res) => {
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

  // Favorites routes
  app.get('/api/favorites', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post('/api/favorites', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedFavorite = insertFavoriteSchema.parse({
        ...req.body,
        userId
      });
      const favorite = await storage.addFavorite(validatedFavorite);
      
      // Award small XP for saving a favorite quote
      const levelingResult = await storage.awardXpWithLeveling(userId, 5, 'quote_favorited');
      
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

  app.delete('/api/favorites/:quoteId', requireAuth, async (req: any, res) => {
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

  app.get('/api/favorites/:quoteId/check', requireAuth, async (req: any, res) => {
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

  // Progress routes
  app.get('/api/progress', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.post('/api/progress', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedProgress = insertUserProgressSchema.parse({
        ...req.body,
        userId
      });
      const progress = await storage.updateUserProgress(validatedProgress);
      
      // Update daily progress and award XP for quote practice
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

  // Quiz routes
  app.post('/api/quiz/session', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessionData = insertQuizSessionSchema.parse({
        ...req.body,
        userId
      });
      
      const session = await storage.createQuizSession(sessionData);
      
      // Award XP with leveling system and update streak
      const levelingResult = await storage.awardXpWithLeveling(userId, sessionData.xpEarned || 0, 'quiz_completed');
      await storage.updateUserStreak(userId);
      
      res.json({
        ...session,
        levelUp: levelingResult.levelUp,
        newLevel: levelingResult.newLevel,
        newXp: levelingResult.newXp
      });
    } catch (error) {
      console.error("Error creating quiz session:", error);
      res.status(500).json({ message: "Failed to create quiz session" });
    }
  });

  app.get('/api/quiz/history', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const history = await storage.getUserQuizHistory(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching quiz history:", error);
      res.status(500).json({ message: "Failed to fetch quiz history" });
    }
  });

  // User stats routes
  app.get('/api/user/stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Achievements routes
  app.get('/api/achievements', async (req, res) => {
    try {
      const achievements = await storage.getAchievements();
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  app.get('/api/achievements/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userAchievements = await storage.getUserAchievements(userId);
      res.json(userAchievements);
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      res.status(500).json({ message: "Failed to fetch user achievements" });
    }
  });

  // Spaced repetition routes
  app.get('/api/study/cards', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const cards = await storage.getCardsDueForReview(userId);
      res.json(cards);
    } catch (error) {
      console.error("Error fetching study cards:", error);
      res.status(500).json({ message: "Failed to fetch study cards" });
    }
  });

  app.get('/api/study/session', requireAuth, async (req: any, res) => {
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

  app.post('/api/study/review', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { quoteId, quality, responseTime } = req.body;
      
      const result = { quality: parseInt(quality), responseTime };
      const updatedProgress = await storage.updateProgressWithSpacedRepetition(userId, quoteId, result);
      
      // Award 10 XP per quote studied (consistent for daily goal tracking)
      const xpGain = 10;
      
      const levelingResult = await storage.awardXpWithLeveling(userId, xpGain, 'spaced_repetition_review');
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

  app.get('/api/study/stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getStudyStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching study stats:", error);
      res.status(500).json({ message: "Failed to fetch study stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function seedInitialData() {
  try {
    // Create admin user if it doesn't exist
    const adminUser = await storage.getUserByUsername('Admin');
    if (!adminUser) {
      const adminPassword = await hashPassword(process.env.ADMIN_PASSWORD || 'changeme-' + Math.random().toString(36).slice(2));
      await storage.createUser({
        id: 'admin-' + Date.now().toString(),
        username: 'Admin',
        email: process.env.ADMIN_EMAIL || 'admin@quotelearn.com',
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        emailVerified: true,
      });
      console.log('Admin user created (username: Admin)');
    }
    
    // Check if categories already exist, create if needed
    let existingCategories = await storage.getCategories();
    let categoryMap: Record<string, number> = {};
    
    if (existingCategories.length === 0) {
      // Create categories
      const categories = await Promise.all([
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
      
      // Build category map
      categories.forEach(cat => {
        categoryMap[cat.name] = cat.id;
      });
      
      console.log("Categories created successfully");
    } else {
      // Build category map from existing categories
      existingCategories.forEach(cat => {
        categoryMap[cat.name] = cat.id;
      });
    }

    // Skip quote seeding - quotes have been intentionally removed
    console.log("Quote seeding is disabled - quotes have been intentionally removed");
    
    // Uncomment the following section if you want to re-enable quote seeding:
    /*
    // Check existing quotes to avoid duplicates
    const existingQuotes = await storage.getQuotes();
    const quotesToAdd = allNewQuotes.filter(newQuote => 
      !existingQuotes.some(existing => 
        existing.text === newQuote.text && existing.author === newQuote.author
      )
    );

    if (quotesToAdd.length > 0) {
      console.log(`Adding ${quotesToAdd.length} new quotes to database...`);
      
      // Batch insert quotes efficiently
      for (const quote of quotesToAdd) {
        const categoryId = categoryMap[quote.category];
        if (categoryId) {
          await storage.createQuote({
            text: quote.text,
            author: quote.author,
            categoryId: categoryId
          });
        }
      }
      
      console.log(`Successfully added ${quotesToAdd.length} quotes`);
    } else {
      console.log("All quotes already exist in database");
    }
    */

    // Create default achievements if needed
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