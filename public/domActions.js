// domActions.js

import { log } from "./logger.client.js";
import { makeDroppable, onDrop } from "./agnosticDraggable.js";
import {
  getDayBounds,
  formatMinutesToTime,
  parseTimeToMinutes,
  timeToRow,
} from "./timeUtils.js";
import { shiftCrewSize } from "./shiftUtils.js";

//=====================================
//      Module-level state
//=====================================

let schedule = null;
let volunteers = null;

//=====================================
//      Data Loading
//=====================================

async function loadSchedule() {
  const res = await fetch("/api/schedule");
  log("Schedule requested");
  return res.json();
}

schedule = loadSchedule();
if (schedule.length === 0) {
  log("No schedule found in DOM");
} else {
  log(`Loaded schedule from API`);
}
export { schedule };

export function loadVolunteersFromDom() {
  const el = document.getElementById("volunteersData");
  return JSON.parse((el?.textContent ?? "[]") || "[]");
}
volunteers = loadVolunteersFromDom();

if (volunteers.length === 0) {
  log("No volunteers found in DOM");
} else {
  log(`Loaded ${volunteers.length} volunteers from DOM`);
}
export { volunteers };

//======================================
//      Public Entry
//======================================

export async function initDomActions() {
  volunteers = loadVolunteersFromDom();
  schedule = await loadSchedule();
  document.addEventListener("filter:select", onFilterSelect);
  applyVolunteerFilters(); // initial pass
}

//======================================
//      Event Handlers
//======================================

function onFilterSelect(event) {
  const { value, id } = event.detail;
  if (id === "scheduleDayDropdown") {
    filterCalendarDay(value);
    return;
  }
  if (id === "vol-rank-filter" || id === "vol-department-filter") {
    applyVolunteerFilters();
  }
}

//======================================
//      Business Logic
//======================================

function filterCalendarDay(day) {
  if (!day || !schedule) return;

  const dayData = schedule.day?.[day];
  if (!dayData) return;

  const { earliest, latest } = getDayBounds(dayData);
  // log(`Schedule for ${day} runs from ${earliestStr} to ${latestStr}`);
  // log("Day bounds (minutes from midnight): ", { earliest, latest });
  const container = document.getElementById("daySchedule");

  if (!dayData) {
    container.textContent = "No Schedule for this Day";
    return;
  }
  const rawDpts = Object.values(dayData.department)
    .map((dpt) => dpt.dpt_name)
    .filter(Boolean);
  popCalendarGrid(dayData);
  log("Raw Depts: ", rawDpts);
  return;
}

//======================================
//      Volunteer Filter Logic
//======================================

const ROLE_LEVEL = {
  NON_REGISTERED: 0,
  REGISTERED: 1,
  KEYMAN: 2,
  OVERSEER: 3,
  ASSISTANT_ADMIN: 4,
  ADMIN: 5,
};

const DEPT_KEY = {
  Lots: "lots_and_garages",
  Signs: "signs",
  Security: "security",
  DO_PU: "dropoff_pickup",
  MS: "mobile_support",
};

function roleLevel(role) {
  return (
    ROLE_LEVEL[
      String(role || "")
        .trim()
        .toUpperCase()
    ] ?? -1
  );
}

function matchesRank(v, rankValue) {
  if (!rankValue) return true;
  const level = roleLevel(v.role);
  if (rankValue === "1") return level === ROLE_LEVEL.REGISTERED;
  if (rankValue === "2") return level === ROLE_LEVEL.KEYMAN;
  if (rankValue === "3") return level >= ROLE_LEVEL.OVERSEER;
  return true;
}

function matchesDept(v, deptValue) {
  if (!deptValue) return true;
  const key = DEPT_KEY[deptValue];
  if (!key) return true;
  return Boolean(v.crews?.[key]);
}

function applyVolunteerFilters() {
  if (!volunteers) return;

  const rankValue = document.getElementById("vol-rank-filter")?.value ?? "";
  const deptValue =
    document.getElementById("vol-department-filter")?.value ?? "";

  const pills = document.querySelectorAll("#name-pool .name-pill.in-pool");
  for (const pill of pills) {
    const id = Number(pill.dataset.id);
    const v = volunteers.find((x) => x.id === id);
    if (!v) {
      pill.style.display = "none";
      continue;
    }
    const show = matchesRank(v, rankValue) && matchesDept(v, deptValue);
    pill.style.display = show ? "" : "none";
  }
}

//=========================================
//      Helpers
//=========================================

function popDptDiv(dpts) {
  const parent = document.getElementById("daySchedule");
  if (!parent) {
    log("daySchedule container not found");
    return;
  }

  parent.replaceChildren();
  for (let i = 0; i < dpts.length; i++) {
    const sec = document.createElement("section");
    sec.classList.add("department");
    sec.dataset.department = dpts[i];

    const header = document.createElement("h3");
    header.textContent = dpts[i];

    const grid = document.createElement("div");
    grid.classList.add("schedule-grid");

    for (let j = 0; j < 4; j++) {
      const dz = document.createElement("div");
      dz.classList.add("schedule-grid-dropzone");
      grid.appendChild(dz);
      makeDroppable(dz, {}, { "droppable:drop": onDrop });
    }
    sec.appendChild(header);
    sec.appendChild(grid);
    parent.appendChild(sec);
  }
}

function popCalendarGrid(dayData) {
  const parent = document.getElementById("daySchedule");
  if (!parent) return;
  parent.replaceChildren();

  const { earliest, latest } = getDayBounds(dayData);
  const totalRows = (latest - earliest) / 15; // 15-min resolution

  const grid = document.createElement("div");
  grid.classList.add("calendar-grid");
  grid.style.gridTemplateRows = `repeat(${totalRows}, 30px)`;

  // Time labels — one per hour
  for (let mins = earliest; mins < latest; mins += 60) {
    const label = document.createElement("div");
    label.classList.add("time-label");
    label.textContent = formatMinutesToTime(mins);

    const row = (mins - earliest) / 15 + 1; // CSS grid is 1-indexed
    label.style.gridRow = `${row} / span 4`; // spans 4 rows = 1 hour
    label.style.gridColumn = "1";

    grid.appendChild(label);
  }
  // Build department columns
  const depts = Object.entries(dayData.department);
  grid.style.gridTemplateColumns = `80px ${depts
    .map(([, dept]) => {
      const maxCrew = Math.max(
        ...Object.values(dept.shift).map((s) => shiftCrewSize(s, "vol_max")),
      );
      return `${maxCrew}fr`;
    })
    .join(" ")}`;
  depts.forEach(([deptKey, dept], colIndex) => {
    const col = colIndex + 2; // +2 because column 1 is time labels

    Object.values(dept.shift).forEach((shift) => {
      const startRow =
        timeToRow(parseTimeToMinutes(shift.schedule.start_time), earliest) + 1;
      const endRow =
        timeToRow(parseTimeToMinutes(shift.schedule.end_time), earliest) + 1;

      const block = document.createElement("div");
      block.classList.add("shift-block");
      block.dataset.department = dept.dpt_name;
      block.dataset.shift = shift.shift_name;
      block.style.gridRow = `${startRow} / ${endRow}`;
      block.style.gridColumn = `${col}`;

      const header = document.createElement("div");
      header.classList.add("shift-block-header");
      header.textContent = `${dept.dpt_name} — ${shift.shift_name}`;
      block.appendChild(header);

      const min = shiftCrewSize(shift, "vol_min");
      const ideal = shiftCrewSize(shift, "vol_ideal");
      const max = shiftCrewSize(shift, "vol_max");
      const isMS = deptKey === "mobile_support";

      // Leadership slots (all departments except mobile support)
      if (!isMS) {
        const kmDz = document.createElement("div");
        kmDz.classList.add("schedule-grid-dropzone", "dz-keyman");
        kmDz.dataset.role = "keyman";
        block.appendChild(kmDz);
        makeDroppable(kmDz, {}, { "droppable:drop": onDrop });

        const kaDz = document.createElement("div");
        kaDz.classList.add("schedule-grid-dropzone", "dz-keyman-asst");
        kaDz.dataset.role = "keyman_asst";
        block.appendChild(kaDz);
        makeDroppable(kaDz, {}, { "droppable:drop": onDrop });
      }

      // Regular volunteer slots
      for (let i = 0; i < max; i++) {
        const dz = document.createElement("div");
        dz.classList.add("schedule-grid-dropzone");
        if (i < min) dz.classList.add("dz-required");
        else if (i < ideal) dz.classList.add("dz-ideal");
        else dz.classList.add("dz-extra");
        block.appendChild(dz);
        makeDroppable(dz, {}, { "droppable:drop": onDrop });
      }
      grid.appendChild(block);
    });
  });

  parent.appendChild(grid);
}
