import { createApp } from './src/app.js';
import { config } from './src/config.js';

createApp().listen(config.port, () => {
  console.log(`🏛  Ágora chat → http://localhost:${config.port}  (datos: ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.database})`);
  if (!config.editorToken) console.warn('⚠  EDITOR_TOKEN no configurado: todas las escrituras editoriales están deshabilitadas.');
});
