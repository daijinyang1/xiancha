-- D1（SQLite）版 scan_log —— 只存哈希与计数，绝不存合同原文。
--
-- 对齐 PostgreSQL 的 server/src/main/resources/db/migration/V1__schema.sql 中 scan_log 表，
-- 但按 D1 的方言改写：bigserial → INTEGER PRIMARY KEY AUTOINCREMENT，
-- timestamptz → TEXT（ISO8601 UTC，带 Z），索引同样建在 created_at DESC 上。
--
-- 应用方式：
--   node tools/deploy-worker.mjs d1-migrate
-- 或手动：
--   wrangler d1 execute <库名> --file=db/migrations/d1/V1__d1_scan_log.sql --remote

CREATE TABLE IF NOT EXISTS scan_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  text_hash     TEXT,
  sentence_hits INTEGER NOT NULL DEFAULT 0,
  rule_hits     INTEGER NOT NULL DEFAULT 0,
  score         INTEGER NOT NULL DEFAULT 0
);

-- 历史查询是 ORDER BY created_at DESC, id DESC LIMIT n
CREATE INDEX IF NOT EXISTS idx_scan_log_created ON scan_log (created_at DESC);
