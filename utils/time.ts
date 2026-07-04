/**
 * Formats seconds into a human-readable string (e.g., "1m 30s" or "45s")
 */
export function formatDuration(seconds: number): string {
  if (seconds >= 60) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
  }
  return `${seconds}s`;
}

/**
 * Formats remaining minutes into a human-readable string (e.g., "1h 30m" or "45m")
 */
export function formatRemainingTime(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

/**
 * Parses a "HH:mm" time string into hours and minutes.
 */
export function parseTimeStr(timeStr: string): { h: number; m: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { h, m };
}

/**
 * Checks if a Date is within the active window defined by "HH:mm" strings.
 */
export function isWithinActiveWindow(date: Date, startStr: string, endStr: string): boolean {
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const { h: startH, m: startM } = parseTimeStr(startStr);
  const { h: endH, m: endM } = parseTimeStr(endStr);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Spans midnight (e.g. 22:00 to 06:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}

/**
 * Adds minutes to a given date, only counting time that falls WITHIN the active window.
 * If the active window ends, it pauses and resumes adding minutes from the start of the next active window.
 */
export function addActiveMinutes(startDate: Date, minutesToAdd: number, startStr: string, endStr: string): Date {
  const { h: startH, m: startM } = parseTimeStr(startStr);
  const { h: endH, m: endM } = parseTimeStr(endStr);
  
  let current = new Date(startDate.getTime());
  let remainingMinutes = minutesToAdd;

  if (startStr === endStr) {
    return new Date(current.getTime() + remainingMinutes * 60000);
  }

  while (remainingMinutes > 0) {
    const curH = current.getHours();
    const curM = current.getMinutes();
    const curMinutes = curH * 60 + curM;
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    let activeStart = startMinutes;
    let activeEnd = endMinutes;

    if (startMinutes > endMinutes) {
      if (curMinutes >= startMinutes || curMinutes <= endMinutes) {
        if (curMinutes >= startMinutes) {
          activeEnd = endMinutes + 1440;
        } else {
          activeStart = startMinutes - 1440;
        }
      } else {
        activeStart = startMinutes;
        activeEnd = endMinutes + 1440;
      }
    }

    if (curMinutes >= activeStart && curMinutes < activeEnd) {
      const minutesLeftToday = activeEnd - curMinutes;
      if (remainingMinutes <= minutesLeftToday) {
        current = new Date(current.getTime() + remainingMinutes * 60000);
        remainingMinutes = 0;
      } else {
        remainingMinutes -= minutesLeftToday;
        const nextDay = new Date(current);
        if (startMinutes > endMinutes && curMinutes >= startMinutes) {
            nextDay.setDate(nextDay.getDate() + 1);
        } else if (startMinutes <= endMinutes) {
            nextDay.setDate(nextDay.getDate() + 1);
        }
        nextDay.setHours(startH, startM, 0, 0);
        current = nextDay;
      }
    } else {
      let nextStartDay = new Date(current);
      if (startMinutes > endMinutes) {
         nextStartDay.setHours(startH, startM, 0, 0);
      } else {
         if (curMinutes < startMinutes) {
            nextStartDay.setHours(startH, startM, 0, 0);
         } else {
            nextStartDay.setDate(nextStartDay.getDate() + 1);
            nextStartDay.setHours(startH, startM, 0, 0);
         }
      }
      current = nextStartDay;
    }
  }

  return current;
}
