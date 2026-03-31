import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { sendVerificationEmail, sendPasswordResetEmail, sendPasswordResetConfirmationEmail } from "./email";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      firstName?: string;
      lastName?: string;
    }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function generateSecureToken(): string {
  return randomBytes(48).toString('base64url');
}

export function setupAuth(app: Express) {
  const PgStore = connectPg(session);

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "quote-app-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      tableName: "sessions",
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`[AUTH] Attempting login for username: ${username}`);
        const user = await storage.getUserByUsername(username);
        console.log(`[AUTH] User found:`, user ? `Yes (id: ${user.id})` : 'No');
        
        if (!user) {
          console.log(`[AUTH] Login failed: user not found`);
          return done(null, false);
        }
        
        console.log(`[AUTH] Checking password for user ${username}`);
        const passwordValid = await comparePasswords(password, user.password || '');
        console.log(`[AUTH] Password valid:`, passwordValid);
        
        if (!passwordValid) {
          console.log(`[AUTH] Login failed: invalid password`);
          return done(null, false);
        }

        // Check if email is verified
        if (!user.emailVerified) {
          console.log(`[AUTH] Login failed: email not verified`);
          return done(null, false, { 
            message: "Please verify your email address before logging in. Check your inbox for the verification link." 
          });
        }
        
        console.log(`[AUTH] Login successful for user ${username}`);
        return done(null, {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          createdAt: user.createdAt || undefined
        });
      } catch (error) {
        console.error(`[AUTH] Login error:`, error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id.toString());
      if (user) {
        done(null, {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          createdAt: user.createdAt || undefined
        });
      } else {
        done(null, null);
      }
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, email, password, firstName, lastName } = req.body;
      
      // Validate required fields
      if (!username || !email || !password) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if user already exists
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
        emailVerified: false,
      });

      // Generate email verification token
      const token = generateSecureToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await storage.createEmailVerificationToken({
        userId: user.id,
        token,
        expiresAt,
      });

      // Send verification email - use stable APP_URL for published app
      const baseUrl = process.env.APP_URL || `http://localhost:5000`;
      const verificationLink = `${baseUrl}/verify-email?token=${token}`;

      try {
        await sendVerificationEmail(email, username, verificationLink);
        console.log(`[AUTH] Verification email sent to ${email}`);
      } catch (emailError) {
        console.error('[AUTH] Failed to send verification email:', emailError);
        // Continue registration even if email fails
      }

      // DO NOT auto-login unverified users
      res.status(201).json({ 
        id: user.id, 
        username: user.username, 
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        emailVerified: false,
        message: "Account created! Please check your email to verify your account before logging in."
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json({ 
      id: req.user!.id, 
      username: req.user!.username, 
      email: req.user!.email,
      firstName: req.user!.firstName,
      lastName: req.user!.lastName 
    });
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json({ 
      id: req.user!.id, 
      username: req.user!.username, 
      email: req.user!.email,
      firstName: req.user!.firstName,
      lastName: req.user!.lastName 
    });
  });
}

export function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}