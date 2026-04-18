// jsonInteraction.js

// This file is for testing JSON data flow from server to client.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const volunteersPath = path.join(__dirname, "volunteers.json"); // same folder as this file
const volunteers = JSON.parse(fs.readFileSync(volunteersPath, "utf-8"));

export function getVolunteers() {
  return volunteers;
}
