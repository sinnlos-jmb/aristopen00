-- Ágora N1-U.17.2 · ejecutar UNA VEZ en la base de la app, tras revisar el nombre de esquema.
-- No ejecuta DROP ni modifica tablas anteriores.
CREATE TABLE IF NOT EXISTS llm_interacciones (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 request_id VARCHAR(100) NOT NULL,
 sesion_hash CHAR(64) NOT NULL,
 modalidad VARCHAR(20) NOT NULL,
 pregunta TEXT NOT NULL,
 respuesta MEDIUMTEXT NOT NULL,
 estado ENUM('ok','error','parcial') NOT NULL DEFAULT 'error',
 modelo VARCHAR(160) NOT NULL DEFAULT '',
 fin_motivo VARCHAR(40) NOT NULL DEFAULT '',
 prompt_version VARCHAR(90) NOT NULL DEFAULT '',
 revision_corpus VARCHAR(128) NOT NULL DEFAULT '',
 fuentes_json LONGTEXT NOT NULL,
 fichas_json LONGTEXT NOT NULL,
 tokens_entrada INT UNSIGNED NULL,
 tokens_salida INT UNSIGNED NULL,
 error_tipo VARCHAR(70) NOT NULL DEFAULT '',
 incompleta TINYINT(1) NOT NULL DEFAULT 0,
 revision_editorial ENUM('pendiente','revisado','candidato_faq','candidato_ficha','problema_citas','problema_sentidos') NOT NULL DEFAULT 'pendiente',
 nota_editorial TEXT NULL,
 revisado_en DATETIME NULL,
 creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_llm_request_id (request_id),
 KEY idx_llm_fecha (creado_en),
 KEY idx_llm_revision (revision_editorial, creado_en),
 KEY idx_llm_modelo (modelo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
