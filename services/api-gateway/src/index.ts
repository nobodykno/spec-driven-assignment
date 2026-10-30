import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';

const port = Number(process.env.PORT ?? 4000);
const logger = createLogger('api-gateway');

createApp({ ...loadConfig(), logger }).listen(port, () => {
  logger.info({ port }, 'API gateway listening');
});
