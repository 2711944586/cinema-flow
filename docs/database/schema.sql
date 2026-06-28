PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS directors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  nationality TEXT,
  birth_year INTEGER,
  bio TEXT,
  portrait_url TEXT,
  active_years TEXT,
  signature_style TEXT,
  awards_json TEXT NOT NULL DEFAULT '[]',
  known_for_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  original_title TEXT,
  director_id INTEGER,
  primary_genre TEXT NOT NULL DEFAULT '剧情',
  rating REAL NOT NULL DEFAULT 0,
  release_year INTEGER NOT NULL,
  release_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'showing',
  poster_url TEXT NOT NULL,
  backdrop_url TEXT NOT NULL,
  trailer_url TEXT,
  duration INTEGER NOT NULL,
  description TEXT NOT NULL,
  language TEXT,
  country TEXT,
  box_office REAL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (director_id) REFERENCES directors(id) ON UPDATE CASCADE ON DELETE SET NULL,
  UNIQUE (title, release_year)
);

CREATE TABLE IF NOT EXISTS genres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS movie_genres (
  movie_id INTEGER NOT NULL,
  genre_id INTEGER NOT NULL,
  PRIMARY KEY (movie_id, genre_id),
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  original_name TEXT,
  nationality TEXT,
  birth_year INTEGER,
  portrait_url TEXT,
  bio TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS movie_people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL,
  person_id INTEGER NOT NULL,
  role_type TEXT NOT NULL DEFAULT 'actor',
  character_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
  UNIQUE (movie_id, person_id, role_type, character_name)
);

CREATE TABLE IF NOT EXISTS media_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  asset_type TEXT NOT NULL,
  url TEXT NOT NULL,
  provider TEXT,
  width INTEGER,
  height INTEGER,
  is_primary INTEGER NOT NULL DEFAULT 0,
  checked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (entity_type, entity_id, asset_type, url)
);

CREATE TABLE IF NOT EXISTS user_movie_states (
  user_id INTEGER NOT NULL,
  movie_id INTEGER NOT NULL,
  is_watched INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  user_rating REAL,
  user_notes TEXT,
  watch_count INTEGER NOT NULL DEFAULT 0,
  last_watched_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, movie_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL,
  user_id INTEGER,
  author TEXT NOT NULL,
  rating REAL NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS watch_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  planned_date TEXT,
  scene TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS watch_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  watched_at TEXT NOT NULL,
  session_rating REAL,
  location TEXT,
  companion TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS watch_log_moods (
  watch_log_id INTEGER NOT NULL,
  mood_tag TEXT NOT NULL,
  PRIMARY KEY (watch_log_id, mood_tag),
  FOREIGN KEY (watch_log_id) REFERENCES watch_logs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recent_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  movie_id INTEGER NOT NULL,
  viewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_route TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS smart_pick_presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  max_duration INTEGER,
  min_rating REAL,
  genres_json TEXT NOT NULL DEFAULT '[]',
  language TEXT,
  include_watched INTEGER NOT NULL DEFAULT 0,
  prefer_favorites INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_movies_director_id ON movies(director_id);
CREATE INDEX IF NOT EXISTS idx_movies_release_year ON movies(release_year);
CREATE INDEX IF NOT EXISTS idx_movies_rating ON movies(rating DESC);
CREATE INDEX IF NOT EXISTS idx_movies_status_year ON movies(status, release_year DESC);
CREATE INDEX IF NOT EXISTS idx_genres_sort_order ON genres(sort_order, name);
CREATE INDEX IF NOT EXISTS idx_movie_genres_genre_id ON movie_genres(genre_id);
CREATE INDEX IF NOT EXISTS idx_movie_people_movie_role ON movie_people(movie_id, role_type, sort_order);
CREATE INDEX IF NOT EXISTS idx_media_assets_entity ON media_assets(entity_type, entity_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_user_movie_states_user_flags ON user_movie_states(user_id, is_favorite, is_watched);
CREATE INDEX IF NOT EXISTS idx_reviews_movie_id ON reviews(movie_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_plans_user_status ON watch_plans(user_id, status, planned_date);
CREATE INDEX IF NOT EXISTS idx_watch_logs_user_watched_at ON watch_logs(user_id, watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_logs_movie_id ON watch_logs(movie_id);
CREATE INDEX IF NOT EXISTS idx_recent_history_user_viewed_at ON recent_history(user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
