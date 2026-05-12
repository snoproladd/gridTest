// agnosticDraggable.js
import { log } from "./logger.client.js";

const { Draggable, Droppable } = window.agnosticDraggable;

import { volunteers } from "./domActions.js";
const ROLE_LEVEL = {
  NON_REGISTERED: 0,
  REGISTERED: 1,
  KEYMAN: 2,
  OVERSEER: 3,
  ASSISTANT_ADMIN: 4,
  ADMIN: 5,
};

const MIN_ROLE_FOR_SLOT = {
  keyman: ROLE_LEVEL.KEYMAN,
  keyman_asst: ROLE_LEVEL.NON_REGISTERED,
};


// Prevent double-binding the same element
const boundDraggables = new WeakSet();
const boundDroppables = new WeakSet();

const DEPT_KEY = {
  "Lots and Garages": "lots_and_garages",
  Signs: "signs",
  Security: "security",
  "Dropoff/Pickup": "dropoff_pickup",
  "Mobile Support": "mobile_support",
};

//==============================================
//    Public API
//==============================================
export function makeDraggable(
  el,
  options = { revert: "invalid", distance: 5 },
  handlers = {},
) {
  if (!el || boundDraggables.has(el)) return;
  boundDraggables.add(el);
  return new Draggable(el, options, handlers);
}

export function makeDroppable(el, options = {}, handlers = {}) {
  if (!el || boundDroppables.has(el)) return;
  boundDroppables.add(el);
  const mergedOptions = {
    accept: (draggable) =>
    canDrop(draggable, el)
  }
  return new Droppable(el, mergedOptions, handlers);
}

export function initPoolPills() {
  document.querySelectorAll("#name-pool .name-pill").forEach((pill) => {
    makeDraggable(
      pill,
      { revert: 'invalid', distance: 5, helper: 'clone', appendTo: "body", cursorAt: {left:20, top:15} },
      {
        "drag:start": onDragStart,
        "drag:stop": onDragStop,
      },
    );
  });
  makeDroppable(
    document.getElementById("name-pool"),
    {},
    {
      "droppable:drop": onReturnToPool,
    },
  );
}

//==============================================
//    Handlers
//==============================================

function onDragStart(event) {
  const pill = event.source;
  const helper = event.helper;
  if (helper !== pill){
    helper.style.width = pill.offsetWidth + 'px';
    }
  pill.classList.add("pill-dragging");
  log(pill.dataset);
}

function onDragStop(event) {
  console.log("drag:stop", event);
}

export function onDrop(event) {
  log("droppable:drop", event);
  const pill = event.draggable.element;
  const dz = event.droppable.element;
  pill.classList.remove("pill-dragging");
  pill.classList.remove("in-pool");
  dz.appendChild(pill);

  // Reset the inline tranform the library applies
  pill.style.position = "";
  pill.style.left = "";
  pill.style.top = "";

  // Destroy stal instance, rebind fresh
  event.draggable.destroy();
  unbindDraggable(pill);
  makeDraggable(pill, { revert: 'invalid', distance: 5, helper: 'clone', appendTo: "body" }, {
    "drag:start": onDragStart,
    "drag:stop": onDragStop,
  })
}

export function onReturnToPool(event) {
  const pill = event.draggable.element;
  const pool = event.droppable.element;
  pill.classList.remove("pill-dragging");
  pill.classList.add("in-pool");
  pool.appendChild(pill);

  // Reset the inline tranform the library applies
  pill.style.position = "";
  pill.style.left = "";
  pill.style.top = "";

  // Destroy stal instance, rebind fresh  
  event.draggable.destroy();
  unbindDraggable(pill);
  makeDraggable(pill, { revert: 'invalid', distance: 5, helper: 'clone', appendTo: "body" }, {
    "drag:start": onDragStart,
    "drag:stop": onDragStop,
  })
}

export function unbindDraggable(el) {
  boundDraggables.delete(el);
}


//==============================================
//  Drop guards and logic
//==============================================

function canDrop(pill, dz) {
  // Role check
  const slotRole = dz.dataset.role;
  if (slotRole) {
    const minLevel = MIN_ROLE_FOR_SLOT[slotRole] ?? 0;
    const volLevel = ROLE_LEVEL[pill.dataset.role?.toUpperCase()] ?? 0;
      console.log(
        "role check:",
        pill.dataset.role,
        volLevel,
        "needs",
        minLevel,
      );

    if (volLevel < minLevel) return false;
  }

  // Department check
  const dept = dz.closest("[data-department]")?.dataset.department;
  if (!dept) return true;
  const crewKey = DEPT_KEY[dept];
  if (!crewKey) return true;
  const volId = Number(pill.dataset.id);
  const volCrews = volunteers.find((v) => v.id === volId)?.crews ?? {};
  return Boolean(volCrews[crewKey]);
}
