-- N1-U.18.2: traza de consultas reales al grafo, sin textos de evidencia ni razonamiento privado.
ALTER TABLE llm_interacciones ADD COLUMN IF NOT EXISTS grafo_json LONGTEXT NULL;
