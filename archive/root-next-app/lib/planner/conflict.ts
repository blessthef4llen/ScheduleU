import type { MeetingBlock } from "./types";

export const DAY_NAME = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const DAY_MAP: Record<string, number> = {
  Su: 0,
  Sun: 0,
  M: 1,
  Mon: 1,
  Tu: 2,
  Tue: 2,
  T: 2,
  W: 3,
  Wed: 3,
  Th: 4,
  Thu: 4,
  F: 5,
  Fri: 5,
  Sa: 6,
  Sat: 6,
};

export function parseDays(daysRaw: string | null | undefined): number[] {
  if (!daysRaw) return [];

  const s = daysRaw.replace(/\s+/g, "").replaceAll("/", "");
  const result: number[] = [];
  let i = 0;

  while (i < s.length) {
    const three = s.slice(i, i + 3);
    if (three === "Sun" || three === "Mon" || three === "Tue" || three === "Wed" || three === "Thu" || three === "Fri" || three === "Sat") {
      result.push(DAY_MAP[three]);
      i += 3;
      continue;
    }

    const two = s.slice(i, i + 2);
    if (two === "Tu" || two === "Th" || two === "Su" || two === "Sa") {
      result.push(DAY_MAP[two]);
      i += 2;
      continue;
    }

    const one = s.slice(i, i + 1);
    if (one === "M" || one === "T" || one === "W" || one === "F") {
      result.push(DAY_MAP[one]);
    }
    i += 1;
  }

  return Array.from(new Set(result)).sort((a, b) => a - b);
}

export function parseTimeRange(rangeRaw: string | null | undefined): {
  ok: boolean;
  startMin?: number;
  endMin?: number;
} {
  if (!rangeRaw) return { ok: false };

  const s = rangeRaw.replace(/\s+/g, "").replace(/[\u2013\u2014]/g, "-");
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?(AM|PM)?-(\d{1,2})(?::(\d{2}))?(AM|PM)?$/i);
  if (!m) return { ok: false };

  const sh = Number(m[1]);
  const sm = Number(m[2] ?? "0");
  let startAP = m[3]?.toUpperCase();

  const eh = Number(m[4]);
  const em = Number(m[5] ?? "0");
  let endAP = m[6]?.toUpperCase();

  if (!startAP && endAP) {
    if (endAP === "PM" && eh === 12 && sh !== 12) {
      startAP = "AM";
    } else if (endAP === "AM" && eh === 12 && sh !== 12) {
      startAP = "PM";
    } else {
      startAP = endAP;
    }
  }

  if (!endAP && startAP) endAP = startAP;
  if (!startAP || !endAP) return { ok: false };

  function toMin(hour: number, minute: number, period: string) {
    let h = hour % 12;
    if (period === "PM") h += 12;
    return h * 60 + minute;
  }

  const startMin = toMin(sh, sm, startAP);
  const endMin = toMin(eh, em, endAP);

  if (endMin <= startMin) return { ok: false };
  return { ok: true, startMin, endMin };
}

export function minToTimeStr(mins: number): string {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${m.toString().padStart(2, "0")}${ampm}`;
}

export function buildBlocks(
  days: string | null | undefined,
  timeRange: string | null | undefined,
  label?: string
): MeetingBlock[] {
  const parsedDays = parseDays(days);
  const parsedTime = parseTimeRange(timeRange);

  if (!parsedDays.length || !parsedTime.ok) return [];

  return parsedDays.map((day) => ({
    day,
    startMin: parsedTime.startMin!,
    endMin: parsedTime.endMin!,
    label,
  }));
}

export function blocksOverlap(a: MeetingBlock, b: MeetingBlock): boolean {
  if (a.day !== b.day) return false;
  return Math.max(a.startMin, b.startMin) < Math.min(a.endMin, b.endMin);
}

export function findConflict(
  candidateBlocks: MeetingBlock[],
  existingBlocks: MeetingBlock[]
): { candidate: MeetingBlock; hit: MeetingBlock } | null {
  for (const candidate of candidateBlocks) {
    const hit = existingBlocks.find((existing) => blocksOverlap(candidate, existing));
    if (hit) return { candidate, hit };
  }
  return null;
}
