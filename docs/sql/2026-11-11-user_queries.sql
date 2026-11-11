-- Migración aditiva de Ágora / MariaDB. Ejecutar una sola vez sobre DB_NAME.
-- No modifica FAQ existentes ni la estructura editorial.
CREATE TABLE IF NOT EXISTS user_queries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  texto_inicial VARCHAR(400) NOT NULL,
  consulta_json JSON NOT NULL,
  estado_sesion VARCHAR(24) NOT NULL,
  aportes_libres_json JSON NOT NULL,
  faq_match_estado VARCHAR(32) NOT NULL,
  faq_match_id VARCHAR(191) NULL,
  PRIMARY KEY (id),
  INDEX idx_user_queries_fecha (creado_en),
  INDEX idx_user_queries_faq_estado (faq_match_estado, creado_en),
  INDEX idx_user_queries_faq_id (faq_match_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
