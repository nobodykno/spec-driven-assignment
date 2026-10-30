import { checkDatabase } from '@app/database';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';

const port = Number(process.env.PORT ?? 4002);
const logger = createLogger('tracker');

createApp({ checkDatabase, config: loadConfig(), logger }).listen(port, () => {
  logger.info({ port }, 'Tracker service listening');
});
