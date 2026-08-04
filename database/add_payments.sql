-- ==========================================================================
-- Media House — Migracja: system płatności
-- Data: 2026-04-25
-- Opis: Dodaje paymentMethod i invoiceUrl do campaigns,
--        tworzy tabelę payments do śledzenia transakcji online,
--        tworzy tabelę invoice_counters do numeracji faktur pro forma
-- ==========================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- --------------------------------------------------------------------------
-- 1. Rozszerzenie tabeli campaigns
-- --------------------------------------------------------------------------

ALTER TABLE `campaigns`
  ADD COLUMN `payment_method` ENUM('proforma', 'p24', 'payu') DEFAULT NULL
    COMMENT 'Wybrana metoda płatności' AFTER `billing_email`,
  ADD COLUMN `invoice_url` VARCHAR(500) DEFAULT NULL
    COMMENT 'URL do faktury pro forma (PDF na S3)' AFTER `payment_method`,
  ADD COLUMN `invoice_number` VARCHAR(50) DEFAULT NULL
    COMMENT 'Numer faktury pro forma, np. FP/2026/04/001' AFTER `invoice_url`;

-- --------------------------------------------------------------------------
-- 2. Tabela payments — śledzenie transakcji bramek płatności
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `payments` (
  `id`            CHAR(36)      NOT NULL COMMENT 'UUID v4',
  `campaign_id`   CHAR(36)      NOT NULL COMMENT 'FK → campaigns.id',
  `provider`      ENUM('p24', 'payu') NOT NULL COMMENT 'Bramka płatności',
  `external_id`   VARCHAR(255)  DEFAULT NULL COMMENT 'ID transakcji w bramce (token/orderId)',
  `session_id`    VARCHAR(255)  DEFAULT NULL COMMENT 'ID sesji płatności (nasz identyfikator)',
  `status`        ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  `amount`        INT UNSIGNED  NOT NULL COMMENT 'Kwota brutto w groszach (PLN)',
  `currency`      CHAR(3)       NOT NULL DEFAULT 'PLN',
  `created_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `paid_at`       DATETIME      DEFAULT NULL,

  PRIMARY KEY (`id`),
  KEY `idx_payments_campaign` (`campaign_id`),
  KEY `idx_payments_external` (`provider`, `external_id`),
  KEY `idx_payments_session` (`session_id`),
  KEY `idx_payments_status` (`status`),

  CONSTRAINT `fk_payments_campaign` FOREIGN KEY (`campaign_id`)
    REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- 3. Tabela invoice_counters — numeracja faktur pro forma
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `invoice_counters` (
  `year`        SMALLINT UNSIGNED NOT NULL,
  `month`       TINYINT UNSIGNED  NOT NULL,
  `last_number` INT UNSIGNED      NOT NULL DEFAULT 0,

  PRIMARY KEY (`year`, `month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================================
-- Koniec migracji
-- ==========================================================================
