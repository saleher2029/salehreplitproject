import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use("/api", router);

const uploadsFromCwd = path.resolve(process.cwd(), "artifacts", "api-server", "uploads");
app.use("/uploads", express.static(uploadsFromCwd));
if (typeof import.meta.dirname === "string") {
  app.use("/uploads", express.static(path.resolve(import.meta.dirname, "..", "uploads")));
}

// ── Static standalone site served at /static-site ──────────────
// Resolve relative to this file: src/ → artifacts/api-server/ → artifacts/ → workspace root
const workspaceRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const staticSiteDir = path.join(workspaceRoot, "static");
const staticSiteIndex = path.join(staticSiteDir, "index.html");

// Use a sub-router so it is processed before the SPA catch-all
const staticSiteRouter = express.Router();
staticSiteRouter.use(express.static(staticSiteDir, { index: "index.html" }));
staticSiteRouter.get("/{*splat}", (_req, res) => {
  if (fs.existsSync(staticSiteIndex)) {
    res.sendFile(staticSiteIndex);
  } else {
    res.status(404).send("Static site not found");
  }
});
// Mount at /api/static-site so the Replit proxy (which maps /api/* to this server)
// makes the site accessible at the /api/static-site path in the preview pane.
// The site is also accessible directly at localhost:8080/static-site for dev use.
app.use("/static-site", staticSiteRouter);
app.use("/api/static-site", staticSiteRouter);

// ── React SPA (built output) ────────────────────────────────────
const staticDir = path.resolve(process.cwd(), "artifacts", "tawjihi", "dist", "public");
app.use(express.static(staticDir));

app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(staticDir, "index.html"), (err) => {
    if (err) {
      res.status(404).json({ error: "Not found" });
    }
  });
});

export default app;
