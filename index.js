// index.js

import app from "./server/app.js";

import { log } from "./logger.server.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  log(`✅ Dev server running at http://localhost:${PORT}`);
});
