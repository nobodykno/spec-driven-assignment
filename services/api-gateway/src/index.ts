import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 4000);
const authServiceUrl = process.env.AUTH_SERVICE_URL ?? 'http://localhost:4001';

createApp({ authServiceUrl }).listen(port, () => {
  console.log(`API gateway listening on port ${port}`);
});
