import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use("/api", router);

const uploadsFromSrc = path.resolve(import.meta.dirname, "..", "uploads");
const uploadsFromCwd = path.resolve(process.cwd(), "artifacts", "api-server", "uploads");
app.use("/uploads", express.static(uploadsFromSrc));
app.use("/uploads", express.static(uploadsFromCwd));

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
