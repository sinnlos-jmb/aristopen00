-- Independent editorial layout store. Does not modify tagging tables.
CREATE TABLE IF NOT EXISTS grafo_disposiciones (
  nombre VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  revision_corpus VARCHAR(128) NOT NULL,
  disposicion_json LONGTEXT NOT NULL CHECK (JSON_VALID(disposicion_json)),
  actualizado DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
