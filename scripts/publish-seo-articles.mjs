import Database from "better-sqlite3";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const dbPath = process.env.CONTENT_DB_PATH || path.join(process.cwd(), "data", "detailing.db");
if (!existsSync(dbPath)) throw new Error(`Content database not found: ${dbPath}`);
const articles = JSON.parse(readFileSync(path.join(process.cwd(), "data", "seo-articles-2026-10.json"), "utf8"));
const db = new Database(dbPath, { fileMustExist: true });
db.pragma("busy_timeout = 5000");
const existing = db.prepare("SELECT 1 FROM blog_posts WHERE slug = ?");
const pending = articles.filter((article) => !existing.get(article.slug));
if (pending.length) {
  const backup = `${dbPath}.seo-${Date.now()}.db`;
  await db.backup(backup);
  const insert = db.prepare("INSERT INTO blog_posts (slug, title, excerpt, content, image, category, date, is_featured) VALUES (@slug, @title, @excerpt, @content, @image, @category, @date, 0) ON CONFLICT(slug) DO NOTHING");
  const inserted = db.transaction(() => pending.reduce((count, article) => count + insert.run(article).changes, 0))();
  console.log(`Published ${inserted} articles; existing articles were preserved. Backup: ${backup}`);
} else console.log("All articles are already present; no changes made.");
db.close();
