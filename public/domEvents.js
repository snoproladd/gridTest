// domEvents.js

/**
 * Public entry point
 * Call once after DOMContentLoaded
 */

import { log } from "./logger.client.js";

export function initDomEvents() {
    log("domEvents initialized")
  bindClickEvents();
  bindChangeEvents();
}

function bindClickEvents() {
    document.addEventListener("click", onClick);
}

function bindChangeEvents() {
    document.addEventListener("change", onChange);
}

function onClick(event) {
    const target = event.target;
    };

function onChange(event) {
    const target = event.target

    if(!target) return;

    const action = target.dataset.action

    if(action !== "filter") return;

        emit("filter:select", {
            value: target.value,
            id: target.id
        });
    }


function emit(type, detail) {
    document.dispatchEvent(
        new CustomEvent(type, {detail, bubbles: true})
    );
}