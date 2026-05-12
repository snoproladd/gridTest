// main.js — entry point for /test
import { initDomEvents } from "./domEvents.js";
import { initDomActions } from "./domActions.js";
import { initPoolPills} from "./agnosticDraggable.js";

initDomEvents();
initPoolPills();
initDomActions();
