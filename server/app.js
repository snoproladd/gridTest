// server/app.js
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import  { getVolunteers }  from "./jsonInteraction.js";


const app = express();

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// If /server/app.js, then project root is one level up
const projectRoot = path.join(__dirname, "..");

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(projectRoot, "views"));

// Static assets (your public folder)
app.use(express.static(path.join(projectRoot, "public")));

// Serve Interact.js dist locally at /vendor
app.use(
  "/vendor",
  express.static(path.join(projectRoot, "node_modules", "interactjs", "dist")),
);

// Demo data (same as before)
const positions = range(1, 5);
function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

app.get("/",  (req, res) => {
  const rawVolunteers =  getVolunteers();
  const namePool = rawVolunteers.map((v) => v.firstName + " " + v.lastName);
  console.log("rawVolunteers: ", rawVolunteers)
  res.render("index", {
    title: "Interact.js Local Test",
    positionDrops: positions,
    namePool: namePool,
    rawVolunteers: rawVolunteers,
  });
});

export default app;

