-- Transport Paca initial schema.

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL,
  params_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  cost_usd REAL,
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_search_history_searched_at ON search_history(searched_at);
CREATE INDEX IF NOT EXISTS idx_search_history_skill_slug ON search_history(skill_slug);

CREATE TABLE IF NOT EXISTS favorited_carriers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  province TEXT,
  city TEXT,
  contact_json TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_favorited_company ON favorited_carriers(company);

CREATE TABLE IF NOT EXISTS blacklisted_carriers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  company_normalized TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blacklisted_company_norm ON blacklisted_carriers(company_normalized);

CREATE TABLE IF NOT EXISTS spend_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_slug TEXT NOT NULL,
  amount_usd REAL NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  web_search_calls INTEGER,
  meta_json TEXT,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spend_logged_at ON spend_log(logged_at);

INSERT OR IGNORE INTO settings (key, value) VALUES ('monthly_budget_usd', '20');
INSERT OR IGNORE INTO settings (key, value) VALUES ('language', 'fr');
