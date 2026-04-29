// server/app.js
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import  { getVolunteers, getSchedule }  from "./jsonInteraction.js";
import { log } from "../logger.server.js";


const app = express();
app.use((req, res, next) => {
  res.locals.IS_DEV = process.env.NODE_ENV !== "production";
  next();
});


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
  res.render("index", {
    title: "Interact.js Local Test",
    positionDrops: positions,
    namePool: namePool,
    rawVolunteers: rawVolunteers,
  });
});



app.get("/test", (req, res) => {
  const rawVolunteers = getVolunteers();
  const namePool = rawVolunteers.map((v) => v.firstName + " " + v.lastName);
  const rawSchedule = getSchedule();
  const days = Object.keys(rawSchedule.day)
  const departments = days.map(day =>({
    day,
    depts: Object.keys(rawSchedule.day[day].department)
  }));
log(departments)

  
const departmentsWithShifts = days.map((day) => ({
  day,
  departments: Object.entries(rawSchedule.day[day].department).map(
    ([deptName, deptObj]) => ({
      dept: deptName,
      shifts: Object.keys(deptObj.shift),
    }),
  ),
}));

const scheduleTree = days.map((day) => ({
  day,
  departments: Object.entries(rawSchedule.day[day].department).map(
    ([deptName, deptObj]) => ({
      dept: deptName,
      shifts: Object.entries(deptObj.shift).map(([shiftName, shiftObj]) => ({
        shift: shiftName,
        schedule: shiftObj.schedule,
        locations: Object.entries(shiftObj.location ?? {})
          .filter(([locKey, locObj]) => {
            if (locObj === null) {
              console.warn("Null location object - skipping:", {
                day,
                deptName,
                shiftName,
                locKey,
              });
              return false;
            }
            return true;
          })
          .map(([locKey, locObj]) => ({
            id: locKey,
            name: locObj.name,
            vol_need: locObj.vol_need,
          })),
      })),
    }),
  ),
}));

  res.render("indexTest", {
    title: "Interact.js Local Test",
    rawSchedule,
    positionDrops: positions,
    namePool,
    rawVolunteers,
    scheduleTree
  });

})

//==============================================
//    HELPERS
//==============================================

function getDayDepts(day){
  days.map((day) => ({
  day,
  departments: Object.entries(rawSchedule.day[day].department).map(
    ([deptName, deptObj]) => ({
      dept: deptName,
      shifts: Object.keys(deptObj.shift),
    }),
  ),
}));
}


//===============================================
//    Internal API
//===============================================

app.get("/api/schedule", (req, res) => {
  res.json(getSchedule());
});

export default app;
