// timeUtils.js

// Time operations for visual schedule representation

import { log } from "./logger.client.js";
import { schedule } from "./domActions.js";

// Parses "9:30 AM" into total minutes from midnight (e.g. 570)
export function parseTimeToMinutes(timeStr) {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return null;
    let [_, hours, minutes, period] = match;
    hours = parseInt(hours);
    minutes = parseInt(minutes);
    if (period.toUpperCase() === "PM" && hours !== 12) {
        hours += 12;
    }
    if (period.toUpperCase() === "AM" && hours === 12) {
        hours = 0;
    }
    return hours * 60 + minutes;
}

// Converts total minutes from midnight back into "9:30 AM" format
export function formatMinutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

// Given a shift object with start and end times, calculate its duration in minutes
export function getDayBounds(dayData) {
    let earliest = Infinity;
    let latest = -Infinity;
    for (const dept of Object.values(dayData.department)){
        for (const shift of Object.values(dept.shift)){
            const start = parseTimeToMinutes(shift.schedule.start_time);
            const end = parseTimeToMinutes(shift.schedule.end_time);
            if (start < earliest) earliest = start;
            if (end > latest) latest = end;
        }
    }
    return { earliest, latest };
}

/** Convert a time (in minutes) to a grid row number */
export function timeToRow(minutes, earliest) {
  return Math.round((minutes - earliest) / 15);
}

