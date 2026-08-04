-- ==========================================================================
-- Migracja: Tabela powiadomień
-- Data: 2026-04-14
-- ==========================================================================

CREATE TABLE IF NOT EXISTS `notifications` (
  `id`          CHAR(36)     NOT NULL COMMENT 'UUID v4',
  `user_id`     CHAR(36)     NOT NULL COMMENT 'FK → users.id',
  `type`        VARCHAR(50)  NOT NULL DEFAULT 'campaign_status_change',
  `title`       VARCHAR(255) NOT NULL,
  `message`     TEXT         NOT NULL,
  `campaign_id` CHAR(36)     DEFAULT NULL COMMENT 'FK → campaigns.id (opcjonalny)',
  `is_read`     TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_notif_user` (`user_id`),
  KEY `idx_notif_user_read` (`user_id`, `is_read`),
  KEY `idx_notif_campaign` (`campaign_id`),
  KEY `idx_notif_created` (`created_at`),

  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notif_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
