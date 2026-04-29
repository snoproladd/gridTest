
// domActions.js


import { log } from "./logger.client.js";

//=====================================
//      Module-level state
//=====================================

let schedule = null;


//=====================================
//      Data Loading
//=====================================

async function loadSchedule() {
    const res = await fetch("/api/schedule");
    log("Schedule requested")
    return res.json();
}


//======================================
//      Public Entry
//======================================

export async function initDomActions() {
    schedule = await loadSchedule();
    log("Schedule: ", schedule)
    document.addEventListener("filter:select", onFilterSelect);
}

//======================================
//      Event Handlers
//======================================

function onFilterSelect(event){
    const {value, id} = event.detail;
    if(id === "scheduleDayDropdown"){
        filterCalendarDay(value);
    }
}

//======================================
//      Business Logic
//======================================

function filterCalendarDay(day){
    if(!day) return;

    if(!schedule){ 
    log("No schedule Loaded")
    return
};
const dayData = schedule.day?.[day];

    log("Filtered day: ", day);
    log("Day Schedule: ", dayData)

    const container = document.getElementById("daySchedule");

        if (!dayData) {
            container.textContent = "No Schedule for this Day";
            return;
        }
        const rawDpts = Object.values(dayData.department)
        .map(dpt => dpt.dpt_name)
        .filter(Boolean);
        popDptDiv(rawDpts);
        log("Raw Depts: ", rawDpts)
        return
    };


//=========================================
//      Helpers
//=========================================

function popDptDiv(dpts) {
    const parent = document.getElementById("daySchedule");
    if (!parent){
        log("daySchedule container not found");
        return;
    }
    
    parent.replaceChildren();
    for(let i = 0; i < dpts.length; i++){
    const sec = document.createElement("section");
        sec.classList.add("department");

    const header = document.createElement("h3");
        header.textContent = dpts[i];

    const grid = document.createElement("div");
    grid.classList.add("schedule-grid");

        for (let j=0; j<4; j++){
            const dz = document.createElement("div");
            dz.classList.add("schedule-grid-dropzone");
            grid.appendChild(dz);
        }
    sec.appendChild(header)
    sec.appendChild(grid)
    parent.appendChild(sec)
    }
}



