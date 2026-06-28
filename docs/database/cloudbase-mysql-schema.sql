SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'viewer',
  avatar_url TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS directors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  nationality VARCHAR(120),
  birth_year INT,
  bio TEXT,
  portrait_url TEXT,
  active_years VARCHAR(80),
  signature_style VARCHAR(255),
  awards_json JSON,
  known_for_json JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_directors_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(220) NOT NULL,
  original_title VARCHAR(220),
  director_id BIGINT UNSIGNED,
  primary_genre VARCHAR(60) NOT NULL DEFAULT '剧情',
  rating DECIMAL(3,1) NOT NULL DEFAULT 0,
  release_year INT NOT NULL,
  release_date DATE NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'showing',
  poster_url TEXT NOT NULL,
  backdrop_url TEXT NOT NULL,
  trailer_url TEXT,
  duration INT NOT NULL,
  description TEXT NOT NULL,
  language VARCHAR(80),
  country VARCHAR(120),
  box_office DECIMAL(14,2),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_movies_title_year (title, release_year),
  KEY idx_movies_director_id (director_id),
  KEY idx_movies_release_year (release_year),
  KEY idx_movies_rating (rating DESC),
  KEY idx_movies_status_year (status, release_year DESC),
  CONSTRAINT fk_movies_director FOREIGN KEY (director_id) REFERENCES directors(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS genres (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_genres_name (name),
  KEY idx_genres_sort_order (sort_order, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movie_genres (
  movie_id BIGINT UNSIGNED NOT NULL,
  genre_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (movie_id, genre_id),
  KEY idx_movie_genres_genre_id (genre_id),
  CONSTRAINT fk_movie_genres_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  CONSTRAINT fk_movie_genres_genre FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS people (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  original_name VARCHAR(160),
  nationality VARCHAR(120),
  birth_year INT,
  portrait_url TEXT,
  bio TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_people_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movie_people (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  movie_id BIGINT UNSIGNED NOT NULL,
  person_id BIGINT UNSIGNED NOT NULL,
  role_type VARCHAR(40) NOT NULL DEFAULT 'actor',
  character_name VARCHAR(160),
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_movie_people_movie_role (movie_id, role_type, sort_order),
  KEY idx_movie_people_person_id (person_id),
  CONSTRAINT fk_movie_people_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  CONSTRAINT fk_movie_people_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS media_assets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  entity_type VARCHAR(40) NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  asset_type VARCHAR(40) NOT NULL,
  url TEXT NOT NULL,
  provider VARCHAR(80),
  width INT,
  height INT,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  checked_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_media_assets_entity (entity_type, entity_id, asset_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_movie_states (
  user_id BIGINT UNSIGNED NOT NULL,
  movie_id BIGINT UNSIGNED NOT NULL,
  is_watched TINYINT(1) NOT NULL DEFAULT 0,
  is_favorite TINYINT(1) NOT NULL DEFAULT 0,
  user_rating DECIMAL(3,1),
  user_notes TEXT,
  watch_count INT NOT NULL DEFAULT 0,
  last_watched_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, movie_id),
  KEY idx_user_movie_states_user_flags (user_id, is_favorite, is_watched),
  KEY idx_user_movie_states_movie_id (movie_id),
  CONSTRAINT fk_user_movie_states_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_movie_states_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  movie_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED,
  author VARCHAR(120) NOT NULL,
  rating DECIMAL(3,1) NOT NULL,
  title VARCHAR(180),
  content TEXT NOT NULL,
  likes INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reviews_movie_id (movie_id, created_at DESC),
  KEY idx_reviews_user_id (user_id),
  CONSTRAINT fk_reviews_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS watch_plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  movie_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  status VARCHAR(30) NOT NULL DEFAULT 'planned',
  planned_date DATE,
  scene VARCHAR(120),
  note TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_watch_plans_user_status (user_id, status, planned_date),
  KEY idx_watch_plans_movie_id (movie_id),
  CONSTRAINT fk_watch_plans_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  CONSTRAINT fk_watch_plans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS watch_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  movie_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  watched_at DATETIME NOT NULL,
  session_rating DECIMAL(3,1),
  location VARCHAR(120),
  companion VARCHAR(120),
  note TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_watch_logs_user_watched_at (user_id, watched_at DESC),
  KEY idx_watch_logs_movie_id (movie_id),
  CONSTRAINT fk_watch_logs_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  CONSTRAINT fk_watch_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS watch_log_moods (
  watch_log_id BIGINT UNSIGNED NOT NULL,
  mood_tag VARCHAR(80) NOT NULL,
  PRIMARY KEY (watch_log_id, mood_tag),
  CONSTRAINT fk_watch_log_moods_log FOREIGN KEY (watch_log_id) REFERENCES watch_logs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS recent_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  movie_id BIGINT UNSIGNED NOT NULL,
  viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_route VARCHAR(180),
  PRIMARY KEY (id),
  KEY idx_recent_history_user_viewed_at (user_id, viewed_at DESC),
  KEY idx_recent_history_movie_id (movie_id),
  CONSTRAINT fk_recent_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_recent_history_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS smart_pick_presets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  max_duration INT,
  min_rating DECIMAL(3,1),
  genres_json JSON,
  language VARCHAR(80),
  include_watched TINYINT(1) NOT NULL DEFAULT 0,
  prefer_favorites TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_smart_pick_presets_user_name (user_id, name),
  CONSTRAINT fk_smart_pick_presets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id BIGINT UNSIGNED,
  before_json JSON,
  after_json JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_entity (entity_type, entity_id, created_at DESC),
  KEY idx_audit_logs_user_id (user_id),
  CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO users (username, password_hash, display_name, role)
VALUES ('admin', 'demo-password-hash', 'CinemaFlow 管理员', 'admin')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), role = VALUES(role);
