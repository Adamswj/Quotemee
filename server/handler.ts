import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve built client assets. process.cwd() is the project root both locally
// and on Vercel (/var/task), where dist/public is placed by the build.
const distPublic = path.join(process.cwd(), "dist", "public");
if (fs.existsSync(distPublic)) {
  app.use(express.static(distPublic));
}

const ready = (async () => {
  await registerRoutes(app);

  // SPA fallback — must come after API routes
  app.use("*", (_req, res) => {
    res.sendFile(path.join(distPublic, "index.html"));
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });
})();

export default async function handler(req: Request, res: Response) {
  await ready;
  return app(req, res);
}
