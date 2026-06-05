import type { Lane, LaneStatus } from "./draftTypes";

/**
 * Lane Resolution Engine
 *
 * Assigns each picked hero to a lane based on heroes_master.json data.
 * Primary lane (first in `lanes` array) is attempted first.
 * If conflict, flex_lanes alternatives are tried.
 * If no lane available, the hero is marked as "flex".
 */

/** Normalize raw lane strings from heroes_master.json to the Lane type */
function normalizeLane(raw: string): Lane | null {
  const lower = raw.toLowerCase().replace(/\s+lane$/i, "").trim();
  switch (lower) {
    case "gold":
      return "Gold";
    case "exp":
      return "EXP";
    case "mid":
      return "Mid";
    case "jungle":
      return "Jungle";
    case "roam":
      return "Roam";
    default:
      return null;
  }
}

/** Map Lane type to the corresponding LaneStatus key */
function laneToKey(lane: Lane): keyof LaneStatus {
  switch (lane) {
    case "Gold":
      return "gold";
    case "EXP":
      return "exp";
    case "Mid":
      return "mid";
    case "Jungle":
      return "jungle";
    case "Roam":
      return "roam";
  }
}

/**
 * Resolves lane assignments for a set of picked heroes.
 *
 * @param picks - Array of hero names that have been picked
 * @param heroesMaster - The full heroes_master.json array
 * @returns LaneStatus showing which hero fills each lane (null if unfilled)
 */
export function resolveLanes(picks: string[], heroesMaster: any[]): LaneStatus {
  const status: LaneStatus = {
    gold: null,
    exp: null,
    mid: null,
    jungle: null,
    roam: null,
  };

  if (!picks || picks.length === 0) {
    return status;
  }

  // Track which heroes still need assignment after primary pass
  const unassigned: Array<{ heroName: string; entry: any }> = [];

  // First pass: assign each hero to their primary lane if available
  for (const heroName of picks) {
    const entry = heroesMaster.find(
      (h: any) => h.hero_name?.toLowerCase() === heroName.toLowerCase()
    );

    if (!entry || !entry.lanes || entry.lanes.length === 0) {
      // Hero not found or has no lane data — will be marked flex later
      unassigned.push({ heroName, entry: null });
      continue;
    }

    // Try primary lane (first in lanes array)
    const primaryLane = normalizeLane(entry.lanes[0]);
    if (primaryLane) {
      const key = laneToKey(primaryLane);
      if (status[key] === null) {
        status[key] = heroName;
        continue;
      }
    }

    // Primary lane taken, defer to flex resolution
    unassigned.push({ heroName, entry });
  }

  // Second pass: try flex_lanes for heroes that couldn't get their primary lane
  for (const { heroName, entry } of unassigned) {
    if (!entry) {
      // No hero data at all — try to find any empty lane (mark as flex)
      assignToAnyEmptyLane(status, heroName);
      continue;
    }

    let assigned = false;

    // Try remaining lanes from the lanes array (index 1+) first
    if (entry.lanes && entry.lanes.length > 1) {
      for (let i = 1; i < entry.lanes.length; i++) {
        const altLane = normalizeLane(entry.lanes[i]);
        if (altLane) {
          const key = laneToKey(altLane);
          if (status[key] === null) {
            status[key] = heroName;
            assigned = true;
            break;
          }
        }
      }
    }

    if (assigned) continue;

    // Try flex_lanes if available
    if (entry.flex_lanes && entry.flex_lanes.length > 0) {
      for (const flexRaw of entry.flex_lanes) {
        const flexLane = normalizeLane(flexRaw);
        if (flexLane) {
          const key = laneToKey(flexLane);
          if (status[key] === null) {
            status[key] = heroName;
            assigned = true;
            break;
          }
        }
      }
    }

    if (assigned) continue;

    // No lane available — assign to any empty lane as "flex" fallback
    assignToAnyEmptyLane(status, heroName);
  }

  return status;
}

/**
 * Assigns a hero to the first available empty lane as a flex/conflict pick.
 * If no lanes are empty, the hero simply cannot be placed (all lanes full).
 */
function assignToAnyEmptyLane(status: LaneStatus, heroName: string): void {
  const keys: (keyof LaneStatus)[] = ["gold", "exp", "mid", "jungle", "roam"];
  for (const key of keys) {
    if (status[key] === null) {
      status[key] = heroName;
      return;
    }
  }
  // All 5 lanes full — hero cannot be placed (shouldn't happen with max 5 picks)
}
