-- ==========================================================================
-- Migracja: Tabela ulubionych nośników
-- Data: 2026-04-14
-- ==========================================================================

CREATE TABLE IF NOT EXISTS `favorites` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    CHAR(36)     NOT NULL COMMENT 'FK → users.id',
  `media_id`   CHAR(36)     NOT NULL COMMENT 'FK → media.id',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_fav_user_media` (`user_id`, `media_id`),
  KEY `idx_fav_user` (`user_id`),
  KEY `idx_fav_media` (`media_id`),

  CONSTRAINT `fk_fav_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_fav_media` FOREIGN KEY (`media_id`) REFERENCES `media` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
