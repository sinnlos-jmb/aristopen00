-- Ágora N1-U.17.3: ejecutar DESPUÉS de 2026-11-23_llm_interacciones.sql.
-- No elimina datos ni modifica las interacciones existentes.
-- MariaDB permite IF NOT EXISTS para evitar errores al repetir la migración.
ALTER TABLE llm_interacciones
  ADD COLUMN IF NOT EXISTS auditoria_llm MEDIUMTEXT NULL
    COMMENT 'Evaluación auto-generada por la LLM, separada de la respuesta pública',
  ADD COLUMN IF NOT EXISTS auditoria_disponible TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '1 cuando se recibió una segunda sección no vacía';
