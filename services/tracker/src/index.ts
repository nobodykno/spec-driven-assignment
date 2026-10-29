import { checkDatabase } from "@app/database";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 4002);

createApp({ checkDatabase }).listen(port, () => {
  console.log(`Tracker service listening on port ${port}`);
});
