/* global interact */
// @ts-check

import { initDomEvents } from "./domEvents.js";
import { initDomActions } from "./domActions.js";

import { log } from "./logger.client.js";


document.addEventListener("DOMContentLoaded", () => {
  initDomEvents();
  initDomActions();
})

/**
 * @typedef {"NON_REGISTERED"|"REGISTERED"|"KEYMAN"|"OVERSEER"|"ASSISTANT_ADMIN"|"ADMIN"} RoleName
 * @typedef {0|1|boolean|null|undefined} CrewFlag
 * @typedef {"crew_lots_garages"|"crew_signs"|"crew_security"|"crew_dropoff_pickup"|"crew_mobile_support"} CrewColumn
 *
 * @typedef {Object} Volunteer
 * @property {number} [id]
 * @property {string} firstName
 * @property {string} lastName
 * @property {RoleName|string} role
 * @property {string} [department]
 * @property {CrewFlag} [crew_lots_garages]
 * @property {CrewFlag} [crew_signs]
 * @property {CrewFlag} [crew_security]
 * @property {CrewFlag} [crew_dropoff_pickup]
 * @property {CrewFlag} [crew_mobile_support]
 */

const ROLE_LEVEL = {
  NON_REGISTERED: 0,
  REGISTERED: 1,
  KEYMAN: 2,
  OVERSEER: 3,
  ASSISTANT_ADMIN: 4,
  ADMIN: 5,
};

/** @type {Record<RoleName, number>} */
const ROLE_LEVEL_TYPED = /** @type {any} */ (ROLE_LEVEL);

/**
 * Normalize just in case there are stray spaces/case differences.
 * @param {unknown} r
 * @returns {string}
 */
function normRole(r) {
  return String(r || "")
    .trim()
    .toUpperCase();
}

/**
 * Get numeric role level from a volunteer's role.
 * Unknown roles return -1.
 * @param {Volunteer} v
 * @returns {number}
 */
function roleLevelOf(v) {
  const key = normRole(v.role);

  if (
    key !== "NON_REGISTERED" &&
    key !== "REGISTERED" &&
    key !== "KEYMAN" &&
    key !== "OVERSEER" &&
    key !== "ASSISTANT_ADMIN" &&
    key !== "ADMIN"
  ) {
    return -1;
  }

  const roleKey = /** @type {RoleName} */ (key);
  return ROLE_LEVEL_TYPED[roleKey];
}

/**
 * @param {number|null} rankIndex selectedIndex from your dropdown
 * @returns {number|null} minimum level required
 */
function minLevelFromRankIndex(rankIndex) {
  // 0 = all
  // 1 = REGISTERED
  // 2 = KEYMAN
  // 3+ = OVERSEER
  if (rankIndex === null || rankIndex === 0) return null;
  if (rankIndex === 1) return ROLE_LEVEL.REGISTERED;
  if (rankIndex === 2) return ROLE_LEVEL.KEYMAN;
  return ROLE_LEVEL.OVERSEER;
}

/**
 * @param {number} departmentIndex
 * @returns {CrewColumn|null}
 */
function getDepartmentFromDepartmentIndex(departmentIndex) {
  if (departmentIndex === 0) return null;

  /** @type {Record<number, CrewColumn>} */
  const map = {
    1: "crew_lots_garages",
    2: "crew_signs",
    3: "crew_security",
    4: "crew_dropoff_pickup",
    5: "crew_mobile_support",
  };

  return map[departmentIndex] ?? null;
}

// -------------------------
// Data Load
// -------------------------

const volunteersDataEl = /** @type {HTMLElement|null} */ (
  document.getElementById("volunteersData")
);

/** @type {Volunteer[]} */
const volunteers = JSON.parse((volunteersDataEl?.textContent ?? "[]") || "[]");

log(
  "Typeof Volunteers in client.js:",
  Object.prototype.toString.call(volunteers),
);
log("Volunteers data in client.js:", volunteers);

// -------------------------
// Sidebar-only Pills Helpers (.in-pool)
// -------------------------

/**
 * Returns ONLY the pills still in the sidebar pool.
 * @returns {NodeListOf<HTMLElement>}
 */
function sidebarPills() {
  const pool = /** @type {HTMLElement|null} */ (
    document.getElementById("name-pool")
  );
  return pool
    ? /** @type {NodeListOf<HTMLElement>} */ (
        pool.querySelectorAll(".name-pill.in-pool")
      )
    : /** @type {NodeListOf<HTMLElement>} */ (
        document.querySelectorAll(".name-pill.in-pool")
      );
}



/**
 * Insert a pill into the pool alphabetically (A→Z).
 * @param {HTMLElement} pool
 * @param {HTMLElement} el
 */
function insertSortedIntoPool(pool, el) {
  const key = (el.textContent || "").trim().toLocaleLowerCase();

  /** @type {HTMLElement[]} */
  const pills = Array.from(pool.querySelectorAll(".name-pill.in-pool"));

  const others = pills.filter((p) => p !== el);

  const before = others.find((p) => {
    const pKey = (p.textContent || "").trim().toLocaleLowerCase();
    return pKey.localeCompare(key) > 0;
  });

  // insertBefore(..., null) = append at end; moves node if already in DOM
  pool.insertBefore(el, before ?? null);
}

/**
 * Sort the sidebar pool alphabetically on initial load.
 */
function sortPoolOnLoad() {
  const pool = /** @type {HTMLElement|null} */ (
    document.getElementById("name-pool")
  );
  if (!pool) return;

  /** @type {HTMLElement[]} */
  const pills = Array.from(pool.querySelectorAll(".name-pill.in-pool"));

  pills
    .sort((a, b) => {
      const A = (a.textContent || "").trim().toLocaleLowerCase();
      const B = (b.textContent || "").trim().toLocaleLowerCase();
      return A.localeCompare(B);
    })
    .forEach((pill) => pool.insertBefore(pill, null));
}

// -------------------------
// Filters (sidebar only)
// -------------------------
function applyFilters() {
  const namePills = sidebarPills();

  const rankSel = /** @type {HTMLSelectElement|null} */ (
    document.getElementById("vol-rank-filter")
  );
  const deptSel = /** @type {HTMLSelectElement|null} */ (
    document.getElementById("vol-department-filter")
  );

  const minLevel = minLevelFromRankIndex(
    rankSel ? rankSel.selectedIndex : null,
  );

  const deptColumn = deptSel
    ? getDepartmentFromDepartmentIndex(deptSel.selectedIndex)
    : null;

  for (const pill of namePills) {
    const fullName = (pill.textContent || "").trim();

    const volunteer = volunteers.find(
      (v) => `${v.firstName} ${v.lastName}` === fullName,
    );

    if (!volunteer) {
      pill.style.display = "none";
      continue;
    }

    // ✅ Role filter
    let roleOK = true;
    if (minLevel !== null) {
      const level = roleLevelOf(volunteer);
      if (minLevel === ROLE_LEVEL.REGISTERED)
        roleOK = level === ROLE_LEVEL.REGISTERED;
      else if (minLevel === ROLE_LEVEL.KEYMAN)
        roleOK = level === ROLE_LEVEL.KEYMAN;
      else roleOK = level >= minLevel;
    }

    // ✅ Department filter
    let deptOK = true;
    if (deptColumn) {
      deptOK = Boolean(volunteer[deptColumn]);
    }

    pill.style.display = roleOK && deptOK ? "" : "none";
  }
}




// -------------------------
// Dropdown Wiring
// -------------------------

const rankSelect = /** @type {HTMLSelectElement|null} */ (
  document.getElementById("vol-rank-filter")
);

rankSelect?.addEventListener("change", (e) => {
  const target = /** @type {HTMLSelectElement|null} */ (e.target);
  if (!target) return;
  applyFilters();
});

const deptSelect = /** @type {HTMLSelectElement|null} */ (
  document.getElementById("vol-department-filter")
);

deptSelect?.addEventListener("change", (e) => {
  const target = /** @type {HTMLSelectElement|null} */ (e.target);
  if (!target) return;
  applyFilters();
    });

// -------------------------
// Drag / Drop (InteractJS)
// -------------------------

const DRAGGABLE_SELECTOR = ".name-pill";
const DROPZONE_SELECTOR = ".schedule-grid-dropzone";
const NAME_POOL_SELECTOR = "#name-pool";

/**
 * Reset transform drag state so the next drag doesn't "teleport".
 * @param {HTMLElement} el
 */
function resetDrag(el) {
  el.style.transform = "translate(0px, 0px)";
  el.removeAttribute("data-x");
  el.removeAttribute("data-y");
}

/**
 * @param {any} event
 */
function dragMoveListener(event) {
  const target = /** @type {HTMLElement} */ (event.target);

  const x =
    (parseFloat(target.getAttribute("data-x") || "0") || 0) + (event.dx || 0);
  const y =
    (parseFloat(target.getAttribute("data-y") || "0") || 0) + (event.dy || 0);

  target.style.transform = `translate(${x}px, ${y}px)`;
  target.setAttribute("data-x", String(x));
  target.setAttribute("data-y", String(y));
}

// Draggables
interact(DRAGGABLE_SELECTOR).draggable({
  inertia: true,
  autoScroll: true,

  listeners: {
    /**
     * @param {any} event
     */
    start(event) {
      const el = /** @type {HTMLElement} */ (event.target);
      el.dataset.dropped = "false";
    },

    move: dragMoveListener,

    /**
     * @param {any} event
     */
    end(event) {
      const el = /** @type {HTMLElement} */ (event.target);

      // If no accepted drop happened, return home
      if (el.dataset.dropped !== "true") {
        resetDrag(el);
      }

      delete el.dataset.dropped;
    },
  },
});

// -------------------------
// Grid Dropzones
// -------------------------

interact(DROPZONE_SELECTOR).dropzone({
  accept: DRAGGABLE_SELECTOR,
  overlap: "pointer",

  /**
   * Optional role-gating: set data-min-role="KEYMAN" etc on a dropzone.
   */
  checker(
    dragEvent,
    event,
    dropped,
    dropzone,
    dropzoneElement,
    draggable,
    draggableElement,
  ) {
    if (!dropped) return false;

    const isEmpty = dropzoneElement.children.length === 0;
    const isAllowed = dropzoneElement.dataset.allow !== "false";

    // Only enforce role rules if the dropzone declares a minimum role
    const minRole = normRole(dropzoneElement.dataset.minRole || "");
    if (!minRole) {
      return isEmpty && isAllowed;
    }

    const dragRole = normRole(draggableElement.dataset.role || "");
    const dragLevel = ROLE_LEVEL[dragRole] ?? -1;
    const minLevel = ROLE_LEVEL[minRole] ?? 999;

    return isEmpty && isAllowed && dragLevel >= minLevel;
  },

  ondropactivate(event) {
    /** @type {HTMLElement} */ (event.target).classList.add("drop-active");
  },

  ondragenter(event) {
    const dz = /** @type {HTMLElement} */ (event.target);
    const el = /** @type {HTMLElement} */ (event.relatedTarget);
    dz.classList.add("drop-target");
    el.classList.add("can-drop");
  },

  ondragleave(event) {
    const dz = /** @type {HTMLElement} */ (event.target);
    const el = /** @type {HTMLElement} */ (event.relatedTarget);
    dz.classList.remove("drop-target");
    el.classList.remove("can-drop");
  },

  ondrop(event) {
    const dz = /** @type {HTMLElement} */ (event.target);
    const el = /** @type {HTMLElement} */ (event.relatedTarget);

    // Once in the grid, it should NOT be filtered by sidebar filters
    el.classList.remove("in-pool");
    el.style.display = ""; // ensure it isn't stuck hidden from a previous filter

    el.dataset.dropped = "true";
    dz.textContent = "";
    dz.appendChild(el);
    resetDrag(el);
  },

  ondropdeactivate(event) {
    const dz = /** @type {HTMLElement} */ (event.target);
    dz.classList.remove("drop-active");
    dz.classList.remove("drop-target");
  },
});

// -------------------------
// Name Pool Dropzone (Reverse Drag)
// -------------------------

interact(NAME_POOL_SELECTOR).dropzone({
  accept: DRAGGABLE_SELECTOR,
  overlap: "pointer",

  // Pool can hold MANY children, so no isEmpty restriction
  checker(dragEvent, event, dropped, dropzone, poolEl, draggable, draggedEl) {
    if (!dropped) return false;
    return poolEl.dataset.allow !== "false";
  },

  ondragenter(event) {
    const pool = /** @type {HTMLElement} */ (event.target);
    const el = /** @type {HTMLElement} */ (event.relatedTarget);
    pool.classList.add("drop-target");
    el.classList.add("can-drop");
  },

  ondragleave(event) {
    const pool = /** @type {HTMLElement} */ (event.target);
    const el = /** @type {HTMLElement} */ (event.relatedTarget);
    pool.classList.remove("drop-target");
    el.classList.remove("can-drop");
  },

  ondrop(event) {
    const pool = /** @type {HTMLElement} */ (event.target);
    const el = /** @type {HTMLElement} */ (event.relatedTarget);

    // Mark as back in pool (filterable again)
    el.classList.add("in-pool");
    el.dataset.dropped = "true";
    resetDrag(el);

    // Insert back sorted
    insertSortedIntoPool(pool, el);

    // Re-apply current filters so it hides/shows properly immediately
    applyFilters();
  },

  ondropdeactivate(event) {
    const pool = /** @type {HTMLElement} */ (event.target);
    pool.classList.remove("drop-target");
  },
});

// -------------------------
// Initial behavior
// -------------------------

sortPoolOnLoad();
applyFilters();