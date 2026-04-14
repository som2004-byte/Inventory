import { createApp } from "./app.js";
import { assertPostgresDatabaseUrl, config } from "./config.js";

assertPostgresDatabaseUrl();

const app = createApp();
app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
