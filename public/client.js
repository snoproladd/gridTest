/* global interact */
// @ts-check

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
 *
 * @property {CrewFlag} [crew_lots_garages]
 * @property {CrewFlag} [crew_signs]
 * @property {CrewFlag} [crew_security]
 * @property {CrewFlag} [crew_dropoff_pickup]
 * @property {CrewFlag} [crew_mobile_support]
 */

const DEPARTMENTS = {
  ALL_DEPARTMENTS: 0,
  LOTS_GARAGES: 1,
  SIGNS_SECURITY: 2,
  DO_PU: 3,
  MOBILE_SUPPORT: 4,
};

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

// -------------------------
// Normalizers / Lookups
// -------------------------

/**
 * Normalize just in case there are stray spaces/case differences.
 * Use function declaration (hoisted) to avoid order/TDZ issues.
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

  // Narrow to RoleName
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
  return ROLE_LEVEL.OVERSEER; // rankIndex >= 3
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

console.log(
  "Typeof Volunteers in client.js:",
  Object.prototype.toString.call(volunteers),
);
console.log("Volunteers data in client.js:", volunteers);

// -------------------------
// Filters
// -------------------------

/**
 * @param {number} departmentIndex
 */
function filterVolunteersByDepartment(departmentIndex) {
  const namePills = /** @type {NodeListOf<HTMLElement>} */ (
    document.querySelectorAll(".name-pill")
  );

  const column = getDepartmentFromDepartmentIndex(departmentIndex);

  // If "All Departments", show everyone
  if (!column) {
    namePills.forEach((pill) => {
      pill.style.display = "";
    });
    return;
  }

  // Filter volunteers where the crew column is truthy (1 / true)
  const allowedNames = new Set(
    volunteers
      .filter((v) => Boolean(v[column]))
      .map((v) => `${v.firstName} ${v.lastName}`),
  );

  // Show / hide pills based on membership
  namePills.forEach((pill) => {
    const fullName = (pill.textContent || "").trim();
    pill.style.display = allowedNames.has(fullName) ? "" : "none";
  });
}

/**
 * @param {number|null} rankIndex
 */
function filterVolunteersByRole(rankIndex) {
  const namePills = /** @type {NodeListOf<HTMLElement>} */ (
    document.querySelectorAll(".name-pill")
  );

  const minLevel = minLevelFromRankIndex(rankIndex);

  const filtered = volunteers.filter((v) => {
    if (minLevel === null) return true;

    const level = roleLevelOf(v);

    if (minLevel === ROLE_LEVEL.REGISTERED) {
      return level === ROLE_LEVEL.REGISTERED; // exact match
    }
    if (minLevel === ROLE_LEVEL.KEYMAN) {
      return level === ROLE_LEVEL.KEYMAN; // exact match
    }
    return level >= minLevel; // OVERSEER and above
  });

  for (const nameEl of namePills) {
    const fullName = (nameEl.textContent || "").trim();
    const allowed = filtered.some(
      (v) => `${v.firstName} ${v.lastName}` === fullName,
    );
    nameEl.style.display = allowed ? "" : "none";
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
  filterVolunteersByRole(target.selectedIndex);
});

const deptSelect = /** @type {HTMLSelectElement|null} */ (
  document.getElementById("vol-department-filter")
);

deptSelect?.addEventListener("change", (e) => {
  const target = /** @type {HTMLSelectElement|null} */ (e.target);
  if (!target) return;
  filterVolunteersByDepartment(target.selectedIndex);
});

// -------------------------
// Drag / Drop (InteractJS)
// -------------------------

const DRAGGABLE_SELECTOR = ".name-pill";
const DROPZONE_SELECTOR = ".schedule-grid-dropzone";
const ASSISTANT_DROP_SELECTOR = "#assistant-dropzone"

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

// Dropzones



interact(DROPZONE_SELECTOR).dropzone({
  accept: DRAGGABLE_SELECTOR,
  overlap: "pointer",

  /**
   * @param {any} dragEvent
   * @param {any} event
   * @param {boolean} dropped
   * @param {any} dropzone
   * @param {HTMLElement} dropzoneElement
   * @param {any} draggable
   * @param {HTMLElement} draggableElement
   * @returns {boolean}
   */
checker(dragEvent, event, dropped, dropzone, dropzoneElement, draggable, draggableElement) {
  if (!dropped) return false;

  const isEmpty = dropzoneElement.children.length === 0;
  const isAllowed = dropzoneElement.dataset.allow !== "false";

  // Only enforce role rules if the dropzone declares a minimum role
  const minRole = normRole(dropzoneElement.dataset.minRole || ""); // e.g. "KEYMAN" or ""
  if (!minRole) {
    return isEmpty && isAllowed; // normal dropzone
  }

  const dragRole = normRole(draggableElement.dataset.role || "");
  const dragLevel = ROLE_LEVEL[dragRole] ?? -1;   // works because ROLE_LEVEL keys are role names
  const minLevel = ROLE_LEVEL[minRole] ?? 999;

  return isEmpty && isAllowed && dragLevel >= minLevel;
},
  /**
   * @param {any} event
   */
  ondropactivate(event) {
    const dz = /** @type {HTMLElement} */ (event.target);
    dz.classList.add("drop-active");
  },

  /**
   * @param {any} event
   */
  ondragenter(event) {
    const dz = /** @type {HTMLElement} */ (event.target);
    const el = /** @type {HTMLElement} */ (event.relatedTarget);
   

    dz.classList.add("drop-target");
    el.classList.add("can-drop");
  },

  /**
   * @param {any} event
   */
  ondragleave(event) {
    const dz = /** @type {HTMLElement} */ (event.target);
    const el = /** @type {HTMLElement} */ (event.relatedTarget);
    dz.classList.remove("drop-target");
    el.classList.remove("can-drop");
  },

  /**
   * @param {any} event
   */
ondrop(event) {
  const dz = /** @type {HTMLElement} */ (event.target);
  const el = /** @type {HTMLElement} */ (event.relatedTarget);

  console.log("DZ role:", dz.dataset.role, "Drag role:", el.dataset.role);

  el.dataset.dropped = "true";
  dz.textContent = "";
  dz.appendChild(el);
  resetDrag(el);
},

  /**
   * @param {any} event
   */
  ondropdeactivate(event) {
    const dz = /** @type {HTMLElement} */ (event.target);
    dz.classList.remove("drop-active");
    dz.classList.remove("drop-target");
  },
});
