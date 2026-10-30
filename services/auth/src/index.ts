import { checkDatabase } from '@app/database';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 4001);

createApp({ checkDatabase }).listen(port, () => {
  console.log(`Auth service listening on port ${port}`);
});
