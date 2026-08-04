-- ==========================================================================
-- Media House — Schemat bazy danych MySQL
-- Wersja: 1.0
-- Data: 2026-04-14
-- Opis: Migracja z systemu plikowego (JSON) na relacyjną bazę MySQL
-- Kompatybilność: MySQL 5.7+ / MariaDB 10.3+
-- ==========================================================================

-- Ustaw kodowanie na UTF-8 (polskie znaki)
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ==========================================================================
-- 1. USERS — użytkownicy systemu
-- Źródło: data/users.json, lib/db/usersRepo.ts
-- ==========================================================================

CREATE TABLE IF NOT EXISTS `users` (
  `id`                CHAR(36)     NOT NULL COMMENT 'UUID v4',
  `email`             VARCHAR(255) NOT NULL,
  `password_hash`     VARCHAR(255) NOT NULL COMMENT 'bcrypt hash',
  `role`              ENUM('client', 'representative', 'admin') NOT NULL DEFAULT 'client',
  `name`              VARCHAR(255) NOT NULL,
  `phone`             VARCHAR(50)  DEFAULT NULL,
  `company`           VARCHAR(255) DEFAULT NULL,
  `nip`               VARCHAR(20)  DEFAULT NULL COMMENT 'NIP firmy (10 cyfr)',
  `email_preferences` JSON         DEFAULT NULL COMMENT 'Preferencje powiadomień email',
  `created_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================================
-- 2. MEDIA — nośniki reklamowe (billboardy, banery)
-- Źródło: data/media.json, lib/db/mediaRepo.ts
-- ==========================================================================

CREATE TABLE IF NOT EXISTS `media` (
  `id`                    CHAR(36)     NOT NULL COMMENT 'UUID v4',
  `code`                  VARCHAR(50)  NOT NULL COMMENT 'Unikalny kod nośnika',
  `owner_id`              CHAR(36)     NOT NULL COMMENT 'FK → users.id (przedstawiciel)',
  `status`                ENUM('pending', 'published', 'rejected', 'archived') NOT NULL DEFAULT 'pending',
  `rejection_reason`      TEXT         DEFAULT NULL,

  -- Lokalizacja
  `address`               VARCHAR(500) NOT NULL,
  `voivodeship`           VARCHAR(30)  NOT NULL COMMENT 'Kod województwa, np. malopolskie',
  `city`                  VARCHAR(100) DEFAULT NULL,
  `gps_lat`               DECIMAL(10,7) NOT NULL,
  `gps_lng`               DECIMAL(10,7) NOT NULL,
  `road_type`             ENUM('krajowa', 'wojewodzka', 'powiatowa', 'gminna', 'ekspresowa', 'autostrada', 'miejska') NOT NULL,

  -- Wymiary i parametry fizyczne
  `size_width_cm`         INT UNSIGNED NOT NULL COMMENT 'Szerokość w cm',
  `size_height_cm`        INT UNSIGNED NOT NULL COMMENT 'Wysokość w cm',
  `height_from_ground_cm` INT UNSIGNED NOT NULL DEFAULT 0,
  `distance_from_road_m`  INT UNSIGNED NOT NULL DEFAULT 0,

  -- Typ i cechy
  `exposition_type`       ENUM('baner', 'plakat') NOT NULL,
  `illuminated`           TINYINT(1)   NOT NULL DEFAULT 0,
  `requires_lift`         TINYINT(1)   NOT NULL DEFAULT 0,
  `description`           TEXT         NOT NULL DEFAULT '' COMMENT 'Opis nośnika',
  `featured`              TINYINT(1)   NOT NULL DEFAULT 0 COMMENT 'Wyróżniony na stronie głównej',

  -- Cennik (kwoty netto w PLN)
  `price_month1`          DECIMAL(10,2) DEFAULT NULL COMMENT 'Cena za 1 miesiąc',
  `price_month3`          DECIMAL(10,2) DEFAULT NULL COMMENT 'Cena za 3 miesiące',
  `price_month6`          DECIMAL(10,2) DEFAULT NULL COMMENT 'Cena za 6 miesięcy',
  `price_month12`         DECIMAL(10,2) DEFAULT NULL COMMENT 'Cena za 12 miesięcy',
  `price_print`           DECIMAL(10,2) DEFAULT NULL COMMENT 'Koszt druku',
  `price_install`         DECIMAL(10,2) DEFAULT NULL COMMENT 'Koszt montażu',

  -- Timestamps
  `created_at`            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `published_at`          DATETIME     DEFAULT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_media_code` (`code`),
  KEY `idx_media_owner` (`owner_id`),
  KEY `idx_media_status` (`status`),
  KEY `idx_media_voivodeship` (`voivodeship`),
  KEY `idx_media_exposition` (`exposition_type`),
  KEY `idx_media_city` (`city`),
  KEY `idx_media_featured` (`featured`),
  KEY `idx_media_gps` (`gps_lat`, `gps_lng`),

  CONSTRAINT `fk_media_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================================
-- 2a. MEDIA_PHOTOS — zdjęcia nośników (1:N)
-- Źródło: media.photos[] w JSON
-- ==========================================================================

CREATE TABLE IF NOT EXISTS `media_photos` (
  `id`        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `media_id`  CHAR(36)     NOT NULL,
  `photo_url` VARCHAR(500) NOT NULL COMMENT 'Ścieżka/URL do pliku',
  `sort_order` TINYINT UNSIGNED NOT NULL DEFAULT 0,

  PRIMARY KEY (`id`),
  KEY `idx_photos_media` (`media_id`),

  CONSTRAINT `fk_photos_media` FOREIGN KEY (`media_id`) REFERENCES `media` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================================
-- 2b. MEDIA_LOCATION_TAGS — tagi lokalizacyjne nośnika (N:M uproszczone)
-- Źródło: media.locationTags[] w JSON
-- ==========================================================================

CREATE TABLE IF NOT EXISTS `media_location_tags` (
  `id`       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `media_id` CHAR(36)     NOT NULL,
  `tag`      VARCHAR(100) NOT NULL,

  PRIMARY KEY (`id`),
  KEY `idx_loctags_media` (`media_id`),
  KEY `idx_loctags_tag` (`tag`),

  CONSTRAINT `fk_loctags_media` FOREIGN KEY (`media_id`) REFERENCES `media` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================================
-- 3. POI_CATEGORIES — słownik kategorii POI
-- Źródło: data/poi-categories.json, lib/db/poiCategoriesRepo.ts
-- Uwaga: musi być PRZED media_nearby_poi (FK zależność)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS `poi_categories` (
  `id`   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL COMMENT 'Nazwa kategorii, lowercase',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_poi_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================================
-- 3a. MEDIA_NEARBY_POI — pobliskie POI nośnika (N:M z poi_categories)
-- Źródło: media.nearbyPoi[] w JSON
-- ==========================================================================

CREATE TABLE IF NOT EXISTS `media_nearby_poi` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `media_id`        CHAR(36)     NOT NULL,
  `poi_category_id` INT UNSIGNED NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_media_poi` (`media_id`, `poi_category_id`),
  KEY `idx_poi_media` (`media_id`),
  KEY `idx_poi_category` (`poi_category_id`),

  CONSTRAINT `fk_nearbypoi_media` FOREIGN KEY (`media_id`) REFERENCES `media` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_nearbypoi_category` FOREIGN KEY (`poi_category_id`) REFERENCES `poi_categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================================
-- 4. CAMPAIGNS — kampanie reklamowe
-- Źródło: data/campaigns.json, lib/db/campaignsRepo.ts
-- ==========================================================================

CREATE TABLE IF NOT EXISTS `campaigns` (
  `id`               CHAR(36)     NOT NULL COMMENT 'UUID v4',
  `client_id`        CHAR(36)     NOT NULL COMMENT 'FK → users.id (klient)',
  `name`             VARCHAR(255) DEFAULT NULL COMMENT 'Opcjonalna nazwa kampanii',
  `status`           ENUM('draft', 'pending_approval', 'awaiting_payment', 'paid', 'active', 'completed', 'cancelled', 'rejected') NOT NULL DEFAULT 'draft',

  -- Dane rozliczeniowe
  `billing_name`     VARCHAR(255) DEFAULT NULL,
  `billing_address`  VARCHAR(500) DEFAULT NULL,
  `billing_nip`      VARCHAR(20)  DEFAULT NULL,
  `billing_email`    VARCHAR(255) DEFAULT NULL,

  -- Sumy (przeliczane z items, przechowywane dla szybkiego odczytu)
  `total_media`      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_print`      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_install`    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_grand`      DECIMAL(12,2) NOT NULL DEFAULT 0.00,

  -- Timestamps
  `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `paid_at`          DATETIME     DEFAULT NULL,

  PRIMARY KEY (`id`),
  KEY `idx_campaigns_client` (`client_id`),
  KEY `idx_campaigns_status` (`status`),

  CONSTRAINT `fk_campaigns_client` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================================
-- 5. CAMPAIGN_ITEMS — pozycje kampanii (nośniki w kampanii)
-- Źródło: campaigns.items[] w JSON
-- ==========================================================================

CREATE TABLE IF NOT EXISTS `campaign_items` (
  `id`             CHAR(36)     NOT NULL COMMENT 'UUID v4',
  `campaign_id`    CHAR(36)     NOT NULL,
  `media_id`       CHAR(36)     NOT NULL,
  `period_days`    SMALLINT UNSIGNED NOT NULL COMMENT '30, 90, 180 lub 365',
  `start_date`     DATE         NOT NULL,
  `end_date`       DATE         NOT NULL,
  `add_print`      TINYINT(1)   NOT NULL DEFAULT 0,
  `add_install`    TINYINT(1)   NOT NULL DEFAULT 0,

  -- Zamrożona cena w momencie dodania do kampanii
  `snap_media`     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `snap_print`     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `snap_install`   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `snap_total`     DECIMAL(10,2) NOT NULL DEFAULT 0.00,

  `hold_id`        CHAR(36)     DEFAULT NULL COMMENT 'FK → holds.id (tymczasowa rezerwacja)',

  PRIMARY KEY (`id`),
  KEY `idx_citems_campaign` (`campaign_id`),
  KEY `idx_citems_media` (`media_id`),

  CONSTRAINT `fk_citems_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_citems_media` FOREIGN KEY (`media_id`) REFERENCES `media` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
  -- FK na hold_id dodawany po utworzeniu tabeli holds (cykliczna zależność)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================================
-- 6. HOLDS — tymczasowe rezerwacje (wygasają po timeout)
-- Źródło: data/holds.json, lib/db/holdsRepo.ts
-- ==========================================================================

CREATE TABLE IF NOT EXISTS `holds` (
  `id`          CHAR(36) NOT NULL COMMENT 'UUID v4',
  `media_id`    CHAR(36) NOT NULL,
  `client_id`   CHAR(36) NOT NULL,
  `campaign_id` CHAR(36) NOT NULL,
  `start_date`  DATE     NOT NULL,
  `end_date`    DATE     NOT NULL,
  `expires_at`  DATETIME NOT NULL COMMENT 'Czas wygaśnięcia holda',

  PRIMARY KEY (`id`),
  KEY `idx_holds_media` (`media_id`),
  KEY `idx_holds_campaign` (`campaign_id`),
  KEY `idx_holds_expires` (`expires_at`),

  CONSTRAINT `fk_holds_media` FOREIGN KEY (`media_id`) REFERENCES `media` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_holds_client` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_holds_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FK campaign_items → holds (dodawany po utworzeniu tabeli holds)
ALTER TABLE `campaign_items`
  ADD CONSTRAINT `fk_citems_hold` FOREIGN KEY (`hold_id`) REFERENCES `holds` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ==========================================================================
-- 7. BOOKINGS — stałe rezerwacje (po opłaceniu kampanii)
-- Źródło: data/bookings.json, lib/db/bookingsRepo.ts
-- ==========================================================================

CREATE TABLE IF NOT EXISTS `bookings` (
  `id`          CHAR(36) NOT NULL COMMENT 'UUID v4',
  `media_id`    CHAR(36) NOT NULL,
  `campaign_id` CHAR(36) NOT NULL,
  `client_id`   CHAR(36) NOT NULL,
  `start_date`  DATE     NOT NULL,
  `end_date`    DATE     NOT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_bookings_media` (`media_id`),
  KEY `idx_bookings_campaign` (`campaign_id`),
  KEY `idx_bookings_client` (`client_id`),
  KEY `idx_bookings_dates` (`media_id`, `start_date`, `end_date`),

  CONSTRAINT `fk_bookings_media` FOREIGN KEY (`media_id`) REFERENCES `media` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_bookings_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_bookings_client` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================================
-- SETTINGS — pozostaje jako plik JSON (data/settings.json)
-- Powód: single-row, rzadko zmieniane, czytane przy każdym requeście
--        — szybszy odczyt z pliku niż round-trip do bazy.
--        settingsRepo.ts nie wymaga migracji.
-- ==========================================================================

-- ==========================================================================
-- 8. Dane początkowe
-- ==========================================================================

-- Kategorie POI
INSERT INTO `poi_categories` (`name`) VALUES
  ('centrum handlowe'),
  ('centrum miasta'),
  ('dworzec'),
  ('hotel'),
  ('kościół'),
  ('osiedle mieszkaniowe'),
  ('park'),
  ('przedszkole'),
  ('przystanek autobusowy'),
  ('restauracje/gastronomia'),
  ('stacja benzynowa'),
  ('stadion'),
  ('szkoła'),
  ('szpital'),
  ('uczelnia'),
  ('urząd');

-- ==========================================================================
-- 9. NOTIFICATIONS — powiadomienia in-app
-- Źródło: lib/db/notificationsRepo.ts
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

-- ==========================================================================
-- 10. FAVORITES — ulubione nośniki klientów
-- Źródło: lib/db/favoritesRepo.ts
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

-- ==========================================================================
-- Koniec schematu
-- ==========================================================================
