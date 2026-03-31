import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth } from "./replitAuth";
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Seed initial data
  await seedInitialData();

  // Auth routes
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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

  app.post('/api/categories', requireAuth, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Quotes routes
  app.get('/api/quotes', async (req, res) => {
    try {
      const { categoryId } = req.query;
      let quotes;
      
      if (categoryId) {
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

  app.get('/api/quotes/random', async (req, res) => {
    try {
      const quote = await storage.getRandomQuote();
      res.json(quote);
    } catch (error) {
      console.error("Error fetching random quote:", error);
      res.status(500).json({ message: "Failed to fetch random quote" });
    }
  });

  app.post('/api/quotes', requireAuth, async (req, res) => {
    try {
      const quoteData = insertQuoteSchema.parse(req.body);
      const quote = await storage.createQuote(quoteData);
      res.json(quote);
    } catch (error) {
      console.error("Error creating quote:", error);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  // Favorites routes
  app.get('/api/favorites', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post('/api/favorites', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { quoteId } = req.body;
      
      const favoriteData = insertFavoriteSchema.parse({
        userId,
        quoteId: parseInt(quoteId)
      });
      
      const favorite = await storage.addFavorite(favoriteData);
      res.json(favorite);
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  app.delete('/api/favorites/:quoteId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quoteId = parseInt(req.params.quoteId);
      
      await storage.removeFavorite(userId, quoteId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  app.get('/api/favorites/:quoteId/check', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quoteId = parseInt(req.params.quoteId);
      
      const isFavorite = await storage.isFavorite(userId, quoteId);
      res.json({ isFavorite });
    } catch (error) {
      console.error("Error checking favorite:", error);
      res.status(500).json({ message: "Failed to check favorite" });
    }
  });

  // Progress routes
  app.get('/api/progress', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.post('/api/progress', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progressData = insertUserProgressSchema.parse({
        ...req.body,
        userId
      });
      
      const progress = await storage.updateUserProgress(progressData);
      res.json(progress);
    } catch (error) {
      console.error("Error updating progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // Quiz routes
  app.post('/api/quiz/session', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessionData = insertQuizSessionSchema.parse({
        ...req.body,
        userId
      });
      
      const session = await storage.createQuizSession(sessionData);
      
      // Update user XP and streak
      await storage.updateUserStats(userId, sessionData.xpEarned || 0);
      await storage.updateUserStreak(userId);
      
      res.json(session);
    } catch (error) {
      console.error("Error creating quiz session:", error);
      res.status(500).json({ message: "Failed to create quiz session" });
    }
  });

  app.get('/api/quiz/history', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  app.get('/api/user/achievements', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const achievements = await storage.getUserAchievements(userId);
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      res.status(500).json({ message: "Failed to fetch user achievements" });
    }
  });

  // Spaced repetition routes
  app.get('/api/study/due', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const dueCards = await storage.getCardsDueForReview(userId);
      res.json(dueCards);
    } catch (error) {
      console.error("Error fetching due cards:", error);
      res.status(500).json({ message: "Failed to fetch due cards" });
    }
  });

  app.get('/api/study/session', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userStats = await storage.getUserStats(userId);
      const session = await storage.getRecommendedStudySession(userId, userStats.level);
      res.json(session);
    } catch (error) {
      console.error("Error fetching study session:", error);
      res.status(500).json({ message: "Failed to fetch study session" });
    }
  });

  app.post('/api/study/review', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { quoteId, quality, responseTime } = req.body;

      if (!quoteId || quality === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const result = { quality: parseInt(quality), responseTime };
      const updatedProgress = await storage.updateProgressWithSpacedRepetition(userId, quoteId, result);
      
      res.json(updatedProgress);
    } catch (error) {
      console.error("Error updating review:", error);
      res.status(500).json({ message: "Failed to update review" });
    }
  });

  app.get('/api/study/stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
    const { allNewQuotes } = await import('./seedData.js');
    
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
        categoryId: categories[0].id
      },
      {
        text: "Love recognizes no barriers. It jumps hurdles, leaps fences, penetrates walls to arrive at its destination full of hope.",
        author: "Maya Angelou",
        categoryId: categories[0].id
      },
      {
        text: "Where there is love there is life.",
        author: "Mahatma Gandhi",
        categoryId: categories[0].id
      },
      {
        text: "Love is the only force capable of transforming an enemy into a friend.",
        author: "Martin Luther King Jr.",
        categoryId: categories[0].id
      },
      {
        text: "To love and be loved is to feel the sun from both sides.",
        author: "David Viscott",
        categoryId: categories[0].id
      },
      {
        text: "You know you're in love when you can't fall asleep because reality is finally better than your dreams.",
        author: "Dr. Seuss",
        categoryId: categories[0].id
      },
      {
        text: "I love her, and that's the beginning and end of everything.",
        author: "F. Scott Fitzgerald",
        categoryId: categories[0].id
      },
      {
        text: "Whatever our souls are made of, his and mine are the same.",
        author: "Emily Brontë",
        categoryId: categories[0].id
      },
      {
        text: "I would rather spend one lifetime with you than face all the ages of this world alone.",
        author: "J. R. R. Tolkien",
        categoryId: categories[0].id
      },
      // Additional love quotes
      {
        text: "Love doesn't make the world go 'round. Love is what makes the ride worthwhile.",
        author: "Franklin P. Jones",
        categoryId: categories[0].id
      },
      {
        text: "We accept the love we think we deserve.",
        author: "Stephen Chbosky",
        categoryId: categories[0].id
      },
      {
        text: "If I know what love is, it is because of you.",
        author: "Hermann Hesse",
        categoryId: categories[0].id
      },
      {
        text: "You don't marry someone you can live with—you marry someone you can't live without.",
        author: "Anonymous",
        categoryId: categories[0].id
      },
      {
        text: "Love is merely a madness.",
        author: "William Shakespeare",
        categoryId: categories[0].id
      },
      {
        text: "Love is the whole thing. We are only pieces.",
        author: "Rumi",
        categoryId: categories[0].id
      },
      {
        text: "The heart has its reasons which reason knows nothing of.",
        author: "Blaise Pascal",
        categoryId: categories[0].id
      },
      {
        text: "The art of love is largely the art of persistence.",
        author: "Albert Ellis",
        categoryId: categories[0].id
      },
      {
        text: "A loving heart is the truest wisdom.",
        author: "Charles Dickens",
        categoryId: categories[0].id
      },
      {
        text: "Love cures people—both the ones who give it and the ones who receive it.",
        author: "Karl Menninger",
        categoryId: categories[0].id
      },
      {
        text: "To love another person is to see the face of God.",
        author: "Victor Hugo",
        categoryId: categories[0].id
      },
      {
        text: "Love sought is good, but given unsought is better.",
        author: "William Shakespeare",
        categoryId: categories[0].id
      },
      {
        text: "Life is the flower for which love is the honey.",
        author: "Victor Hugo",
        categoryId: categories[0].id
      },
      {
        text: "Love is like the wind—you can't see it, but you can feel it.",
        author: "Nicholas Sparks",
        categoryId: categories[0].id
      },
      {
        text: "Love is a canvas furnished by nature and embroidered by imagination.",
        author: "Voltaire",
        categoryId: categories[0].id
      },
      {
        text: "There is no charm equal to tenderness of heart.",
        author: "Jane Austen",
        categoryId: categories[0].id
      },
      {
        text: "Love is not something you find. Love is something that finds you.",
        author: "Loretta Young",
        categoryId: categories[0].id
      },
      {
        text: "Where there is great love, there are always miracles.",
        author: "Willa Cather",
        categoryId: categories[0].id
      },
      {
        text: "To be your friend was all I ever wanted; to be your lover was all I ever dreamed.",
        author: "Valerie Lombardo",
        categoryId: categories[0].id
      },
      {
        text: "Love is the only gold.",
        author: "Alfred Lord Tennyson",
        categoryId: categories[0].id
      },
      {
        text: "The giving of love is an education in itself.",
        author: "Eleanor Roosevelt",
        categoryId: categories[0].id
      },
      {
        text: "Love is the greatest refreshment in life.",
        author: "Pablo Picasso",
        categoryId: categories[0].id
      },
      {
        text: "A simple 'I love you' means more than money.",
        author: "Frank Sinatra",
        categoryId: categories[0].id
      },
      {
        text: "Love is an untamed force.",
        author: "Paulo Coelho",
        categoryId: categories[0].id
      },
      {
        text: "Love is the expansion of two natures in such fashion that each includes the other.",
        author: "Felix Adler",
        categoryId: categories[0].id
      },
      {
        text: "Love is a better teacher than duty.",
        author: "Albert Einstein",
        categoryId: categories[0].id
      },
      {
        text: "Love is a friendship set to music.",
        author: "Joseph Campbell",
        categoryId: categories[0].id
      },
      {
        text: "Love is the magician that pulls man out of his own hat.",
        author: "Ben Hecht",
        categoryId: categories[0].id
      },
      {
        text: "Love looks not with the eyes, but with the mind.",
        author: "William Shakespeare",
        categoryId: categories[0].id
      },
      {
        text: "The first duty of love is to listen.",
        author: "Paul Tillich",
        categoryId: categories[0].id
      },
      {
        text: "We loved with a love that was more than love.",
        author: "Edgar Allan Poe",
        categoryId: categories[0].id
      },
      {
        text: "Love is when the other person's happiness is more important than your own.",
        author: "H. Jackson Brown Jr.",
        categoryId: categories[0].id
      },
      {
        text: "Love conquers all.",
        author: "Virgil",
        categoryId: categories[0].id
      },
      {
        text: "Love is the ultimate outlaw.",
        author: "Tom Robbins",
        categoryId: categories[0].id
      },
      {
        text: "True love stories never have endings.",
        author: "Richard Bach",
        categoryId: categories[0].id
      },
      {
        text: "To love oneself is the beginning of a lifelong romance.",
        author: "Oscar Wilde",
        categoryId: categories[0].id
      },
      {
        text: "Love is the joy of the good, the wonder of the wise.",
        author: "Plato",
        categoryId: categories[0].id
      },
      {
        text: "A successful marriage requires falling in love many times, always with the same person.",
        author: "Mignon McLaughlin",
        categoryId: categories[0].id
      },
      {
        text: "Love is life. And if you miss love, you miss life.",
        author: "Leo Buscaglia",
        categoryId: categories[0].id
      },
      {
        text: "There is no love without forgiveness, and there is no forgiveness without love.",
        author: "Bryant H. McGill",
        categoryId: categories[0].id
      },
      {
        text: "Love is an endless act of forgiveness—a tender look which becomes a habit.",
        author: "Peter Ustinov",
        categoryId: categories[0].id
      },
      {
        text: "Love does not dominate; it cultivates.",
        author: "Johann Wolfgang von Goethe",
        categoryId: categories[0].id
      },
      {
        text: "Love is the flower you've got to let grow.",
        author: "John Lennon",
        categoryId: categories[0].id
      },
      {
        text: "Love is a smoke made with the fume of sighs.",
        author: "William Shakespeare",
        categoryId: categories[0].id
      },
      {
        text: "Love lives in the humblest hut.",
        author: "Henry van Dyke",
        categoryId: categories[0].id
      },
      {
        text: "The way to love anything is to realize that it might be lost.",
        author: "G. K. Chesterton",
        categoryId: categories[0].id
      },
      {
        text: "Love is like war: easy to begin but very hard to stop.",
        author: "H. L. Mencken",
        categoryId: categories[0].id
      },
      {
        text: "Love me and the world is mine.",
        author: "David Reed",
        categoryId: categories[0].id
      },
      {
        text: "Love takes off masks that we fear we cannot live without and know we cannot live within.",
        author: "James Baldwin",
        categoryId: categories[0].id
      },
      {
        text: "Love consists in desiring to give what is our own to another and feeling his delight as our own.",
        author: "Emanuel Swedenborg",
        categoryId: categories[0].id
      },
      {
        text: "One word frees us of all the weight and pain of life: that word is love.",
        author: "Sophocles",
        categoryId: categories[0].id
      },
      {
        text: "Love is trembling happiness.",
        author: "Kahlil Gibran",
        categoryId: categories[0].id
      },
      {
        text: "Love is not only something you feel—it is something you do.",
        author: "David Wilkerson",
        categoryId: categories[0].id
      },
      {
        text: "Where love is, no room is too small.",
        author: "Talmud",
        categoryId: categories[0].id
      },
      {
        text: "Love is a game that two can play and both win.",
        author: "Eva Gabor",
        categoryId: categories[0].id
      },
      {
        text: "The heart wants what it wants. There's no logic to these things.",
        author: "Woody Allen",
        categoryId: categories[0].id
      },
      {
        text: "Love has no age, no limit, and no death.",
        author: "John Galsworthy",
        categoryId: categories[0].id
      },
      {
        text: "Love is the voice under all silences, the hope which has no opposite in fear.",
        author: "E. E. Cummings",
        categoryId: categories[0].id
      },
      {
        text: "Love in its essence is spiritual fire.",
        author: "Seneca",
        categoryId: categories[0].id
      },
      {
        text: "Love is a temporary madness; it erupts like volcanoes and then subsides.",
        author: "Louis de Bernières",
        categoryId: categories[0].id
      },
      {
        text: "To be brave is to love unconditionally without expecting anything in return.",
        author: "Madonna",
        categoryId: categories[0].id
      },
      {
        text: "Love is the poetry of the senses.",
        author: "Honoré de Balzac",
        categoryId: categories[0].id
      },
      {
        text: "Self-love, my liege, is not so vile a sin as self-neglecting.",
        author: "William Shakespeare",
        categoryId: categories[0].id
      },
      {
        text: "Love is like π—natural, irrational, and very important.",
        author: "Lisa Hoffman",
        categoryId: categories[0].id
      },
      {
        text: "The first breath of love is the last breath of wisdom.",
        author: "Turkish Proverb",
        categoryId: categories[0].id
      },
      {
        text: "Love is a friendship set on fire.",
        author: "Jeremy Taylor",
        categoryId: categories[0].id
      },
      {
        text: "Love is what you've been through with somebody.",
        author: "James Thurber",
        categoryId: categories[0].id
      },
      {
        text: "In dreams and in love there are no impossibilities.",
        author: "János Arany",
        categoryId: categories[0].id
      },
      {
        text: "To fall in love is awfully simple; to fall out of love is simply awful.",
        author: "Bess Myerson",
        categoryId: categories[0].id
      },
      {
        text: "Love is space and time measured by the heart.",
        author: "Marcel Proust",
        categoryId: categories[0].id
      },
      {
        text: "Love is the greatest adventure.",
        author: "Anonymous",
        categoryId: categories[0].id
      },
      {
        text: "Love is the absence of judgment.",
        author: "Dalai Lama XIV",
        categoryId: categories[0].id
      },
      {
        text: "Fortune and love favor the brave.",
        author: "Ovid",
        categoryId: categories[0].id
      },
      {
        text: "We can only learn to love by loving.",
        author: "Iris Murdoch",
        categoryId: categories[0].id
      },
      {
        text: "Love is the master key that opens the gates of happiness.",
        author: "Oliver Wendell Holmes Sr.",
        categoryId: categories[0].id
      },
      {
        text: "Love will find a way through paths where wolves fear to prey.",
        author: "Lord Byron",
        categoryId: categories[0].id
      },
      {
        text: "The best proof of love is trust.",
        author: "Joyce Brothers",
        categoryId: categories[0].id
      },
      {
        text: "Love is the only sane and satisfactory answer to the problem of human existence.",
        author: "Erich Fromm",
        categoryId: categories[0].id
      },
      {
        text: "You don't love someone because they're perfect; you love them in spite of their flaws.",
        author: "Jodi Picoult",
        categoryId: categories[0].id
      },
      {
        text: "Love is when you meet someone who tells you something new about yourself.",
        author: "André Breton",
        categoryId: categories[0].id
      },
      {
        text: "Age does not protect you from love, but love protects you from age.",
        author: "Jeanne Moreau",
        categoryId: categories[0].id
      },
      {
        text: "Love begins at home.",
        author: "Mother Teresa",
        categoryId: categories[0].id
      },
      {
        text: "Love is not love until love's vulnerable.",
        author: "Theodore Roethke",
        categoryId: categories[0].id
      },
      {
        text: "Love is life's greatest blessing.",
        author: "Anonymous",
        categoryId: categories[0].id
      },
      {
        text: "The chance to love and be loved exists no matter where you are.",
        author: "Oprah Winfrey",
        categoryId: categories[0].id
      },
      {
        text: "Love is the bridge between two hearts.",
        author: "Anonymous",
        categoryId: categories[0].id
      },
      {
        text: "You always gain by giving love.",
        author: "Reese Witherspoon",
        categoryId: categories[0].id
      },
      {
        text: "Love is the enchanted dawn of every heart.",
        author: "Alphonse de Lamartine",
        categoryId: categories[0].id
      },
      {
        text: "Love is like the wild rose-briar; friendship like the holly-tree.",
        author: "Emily Brontë",
        categoryId: categories[0].id
      },
      {
        text: "Paradise is always where love dwells.",
        author: "Jean Paul Richter",
        categoryId: categories[0].id
      },
      {
        text: "Love is the triumph of imagination over intelligence.",
        author: "H. L. Mencken",
        categoryId: categories[0].id
      },
      {
        text: "Love's greatest gift is its ability to make everything it touches sacred.",
        author: "Barbara De Angelis",
        categoryId: categories[0].id
      },
      {
        text: "Love is not breathlessness… it is still and calm.",
        author: "W. Somerset Maugham",
        categoryId: categories[0].id
      },
      {
        text: "Love grows more tremendously full, swift, poignant, as the years multiply.",
        author: "Zane Grey",
        categoryId: categories[0].id
      },
      {
        text: "Love's like the measles; we all have to go through it.",
        author: "Jerome K. Jerome",
        categoryId: categories[0].id
      },
      {
        text: "Love is a promise; love is a souvenir—once given never forgotten.",
        author: "John Lennon",
        categoryId: categories[0].id
      },
      {
        text: "Love is the ultimate truth at the heart of creation.",
        author: "Rabindranath Tagore",
        categoryId: categories[0].id
      },
      {
        text: "Love is an energy which exists of itself. It is its own value.",
        author: "Thornton Wilder",
        categoryId: categories[0].id
      },
      {
        text: "Love surrounds every being and extends slowly to embrace all that shall be.",
        author: "Pierre Teilhard de Chardin",
        categoryId: categories[0].id
      },
      {
        text: "Love is the beauty of the soul.",
        author: "Augustine of Hippo",
        categoryId: categories[0].id
      },
      {
        text: "If I had a flower for every time I thought of you, I could walk through my garden forever.",
        author: "Alfred Lord Tennyson",
        categoryId: categories[0].id
      },
      {
        text: "How do I love thee? Let me count the ways.",
        author: "Elizabeth Barrett Browning",
        categoryId: categories[0].id
      },
      {
        text: "I love you without knowing how, or when, or from where.",
        author: "Pablo Neruda",
        categoryId: categories[0].id
      },
      {
        text: "My bounty is as boundless as the sea, my love as deep.",
        author: "William Shakespeare",
        categoryId: categories[0].id
      },
      {
        text: "Being deeply loved by someone gives you strength, while loving someone deeply gives you courage.",
        author: "Lao Tzu",
        categoryId: categories[0].id
      },
      {
        text: "All, everything that I understand, I only understand because I love.",
        author: "Leo Tolstoy",
        categoryId: categories[0].id
      },
      {
        text: "Love does not consist in gazing at each other, but in looking outward together in the same direction.",
        author: "Antoine de Saint-Exupéry",
        categoryId: categories[0].id
      },
      {
        text: "i carry your heart with me (i carry it in my heart).",
        author: "E. E. Cummings",
        categoryId: categories[0].id
      },
      {
        text: "Love is the bridge between you and everything.",
        author: "Rumi",
        categoryId: categories[0].id
      },
      {
        text: "Who, being loved, is poor?",
        author: "Oscar Wilde",
        categoryId: categories[0].id
      },
      {
        text: "You have bewitched me, body and soul, and I love, I love, I love you.",
        author: "Jane Austen",
        categoryId: categories[0].id
      },
      {
        text: "Spread love everywhere you go. Let no one ever come to you without leaving happier.",
        author: "Mother Teresa",
        categoryId: categories[0].id
      },
      {
        text: "The best and most beautiful things in the world cannot be seen or even heard, but must be felt with the heart.",
        author: "Helen Keller",
        categoryId: categories[0].id
      },
      {
        text: "Immature love says, 'I love you because I need you.' Mature love says, 'I need you because I love you.'",
        author: "Erich Fromm",
        categoryId: categories[0].id
      },
      {
        text: "Love knows not its own depth until the hour of separation.",
        author: "Kahlil Gibran",
        categoryId: categories[0].id
      },
      {
        text: "Love has nothing to do with what you are expecting to get—only with what you are expecting to give, which is everything.",
        author: "Katharine Hepburn",
        categoryId: categories[0].id
      },
      {
        text: "It is a curious thought, but it is only when you see people looking ridiculous that you realize just how much you love them.",
        author: "Agatha Christie",
        categoryId: categories[0].id
      },
      {
        text: "Gravitation is not responsible for people falling in love.",
        author: "Albert Einstein",
        categoryId: categories[0].id
      },
      {
        text: "There is always some madness in love. But there is also always some reason in madness.",
        author: "Friedrich Nietzsche",
        categoryId: categories[0].id
      },
      {
        text: "Love is that condition in which the happiness of another person is essential to your own.",
        author: "Robert A. Heinlein",
        categoryId: categories[0].id
      },
      {
        text: "I love you not only for what you are, but for what I am when I am with you.",
        author: "Mary Carolyn Davies",
        categoryId: categories[0].id
      },
      {
        text: "All you need is love.",
        author: "John Lennon",
        categoryId: categories[0].id
      },
      {
        text: "When you realize you want to spend the rest of your life with somebody, you want the rest of your life to start as soon as possible.",
        author: "Nora Ephron",
        categoryId: categories[0].id
      },
      {
        text: "The best love is the kind that awakens the soul and makes us reach for more.",
        author: "Nicholas Sparks",
        categoryId: categories[0].id
      },
      {
        text: "Love consists of this: two solitudes that meet and protect each other.",
        author: "Rainer Maria Rilke",
        categoryId: categories[0].id
      },
      {
        text: "There is only one happiness in this life, to love and be loved.",
        author: "George Sand",
        categoryId: categories[0].id
      },
      {
        text: "There is no remedy for love but to love more.",
        author: "Henry David Thoreau",
        categoryId: categories[0].id
      },
      {
        text: "Love is a great beautifier.",
        author: "Louisa May Alcott",
        categoryId: categories[0].id
      },
      {
        text: "Love is a thing full of anxious fears.",
        author: "Ovid",
        categoryId: categories[0].id
      },
      {
        text: "At the touch of love everyone becomes a poet.",
        author: "Plato",
        categoryId: categories[0].id
      },
      {
        text: "For small creatures such as we, the vastness is bearable only through love.",
        author: "Carl Sagan",
        categoryId: categories[0].id
      },
      {
        text: "Love is not love which alters when it alteration finds.",
        author: "William Shakespeare",
        categoryId: categories[0].id
      },
      {
        text: "Love yourself first and everything else falls into line.",
        author: "Lucille Ball",
        categoryId: categories[0].id
      },
      {
        text: "One is loved because one is loved. No reason is needed for loving.",
        author: "Paulo Coelho",
        categoryId: categories[0].id
      },
      {
        text: "If you have it [love], you don't need to have anything else.",
        author: "J. M. Barrie",
        categoryId: categories[0].id
      },
      {
        text: "Never close your lips to those to whom you have already opened your heart.",
        author: "Charles Dickens",
        categoryId: categories[0].id
      },
      {
        text: "That love is all there is, is all we know of love.",
        author: "Emily Dickinson",
        categoryId: categories[0].id
      },
      {
        text: "A kiss is a lovely trick designed by nature to stop speech when words become superfluous.",
        author: "Ingrid Bergman",
        categoryId: categories[0].id
      },
      {
        text: "I like not only to be loved, but also to be told I am loved.",
        author: "George Eliot",
        categoryId: categories[0].id
      },
      
      // Science quotes
      {
        text: "Science is a way of thinking much more than it is a body of knowledge.",
        author: "Carl Sagan",
        categoryId: categories[1].id
      },
      {
        text: "The important thing is not to stop questioning.",
        author: "Albert Einstein",
        categoryId: categories[1].id
      },
      {
        text: "Science knows no country, because knowledge belongs to humanity, and is the torch which illuminates the world.",
        author: "Louis Pasteur",
        categoryId: categories[1].id
      },
      
      // History quotes
      {
        text: "Those who cannot remember the past are condemned to repeat it.",
        author: "George Santayana",
        categoryId: categories[2].id
      },
      {
        text: "History will be kind to me for I intend to write it.",
        author: "Winston Churchill",
        categoryId: categories[2].id
      },
      {
        text: "The only thing we learn from history is that we learn nothing from history.",
        author: "Georg Wilhelm Friedrich Hegel",
        categoryId: categories[2].id
      },
      
      // Finance quotes
      {
        text: "An investment in knowledge pays the best interest.",
        author: "Benjamin Franklin",
        categoryId: categories[3].id
      },
      {
        text: "It's not how much money you make, but how much money you keep, how hard it works for you, and how many generations you keep it for.",
        author: "Robert Kiyosaki",
        categoryId: categories[3].id
      },
      {
        text: "The stock market is filled with individuals who know the price of everything, but the value of nothing.",
        author: "Philip Fisher",
        categoryId: categories[3].id
      }
    ];

    await Promise.all(quotes.map(quote => storage.createQuote(quote)));

    // Create sample achievements
    const achievements = [
      {
        name: "First Steps",
        description: "Complete your first quote practice session",
        icon: "fas fa-baby",
        xpReward: 10,
        requirement: { type: "quiz_complete", count: 1 }
      },
      {
        name: "Week Warrior",
        description: "Maintain a 7-day learning streak",
        icon: "fas fa-fire",
        xpReward: 50,
        requirement: { type: "streak", count: 7 }
      },
      {
        name: "Science Scholar",
        description: "Master 10 science quotes",
        icon: "fas fa-graduation-cap",
        xpReward: 25,
        requirement: { type: "category_mastery", category: "Science", count: 10 }
      },
      {
        name: "Quote Collector",
        description: "Favorite 25 quotes",
        icon: "fas fa-star",
        xpReward: 30,
        requirement: { type: "favorites", count: 25 }
      }
    ];

    // Create achievements using storage interface
    for (const achievement of achievements) {
      try {
        const validatedAchievement = insertAchievementSchema.parse(achievement);
        await db.insert(achievementsTable).values(validatedAchievement);
      } catch (error) {
        console.log('Skipping achievement creation (likely already exists):', achievement.name);
      }
    }

    console.log("Initial data seeded successfully");
  } catch (error) {
    console.error("Error seeding initial data:", error);
  }
}
