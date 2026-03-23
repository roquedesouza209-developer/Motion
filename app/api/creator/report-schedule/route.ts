import { NextResponse } from "next/server";

import { getAuthUser } from "@/lib/server/auth";
import { createId } from "@/lib/server/crypto";
import { updateDb } from "@/lib/server/database";
import { formatRelativeTime } from "@/lib/server/format";
import type {
  CreatorReportDeliveryRecord,
  CreatorReportFormat,
  CreatorReportFrequency,
  CreatorReportRange,
  CreatorReportScheduleRecord,
  MotionDb,
} from "@/lib/server/types";

type ScheduleBody = {
  enabled?: boolean;
  destinationEmail?: string;
  frequency?: CreatorReportFrequency;
  format?: CreatorReportFormat;
  range?: CreatorReportRange;
};

function isValidEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email);
}

function parseFrequency(value: unknown): CreatorReportFrequency {
  return value === "daily" || value === "weekly" || value === "monthly"
    ? value
    : "weekly";
}

function parseFormat(value: unknown): CreatorReportFormat {
  return value === "csv" || value === "json" || value === "excel" || value === "pdf"
    ? value
    : "pdf";
}

function parseRange(value: unknown): CreatorReportRange {
  return value === "7d" || value === "90d" ? value : "30d";
}

function getNextSendAt(
  frequency: CreatorReportFrequency,
  fromDate = new Date(),
): string {
  const next = new Date(fromDate);

  if (frequency === "daily") {
    next.setDate(next.getDate() + 1);
  } else if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
  } else {
    next.setMonth(next.getMonth() + 1);
  }

  return next.toISOString();
}

function processDueSchedules(db: MotionDb, userId: string) {
  const now = Date.now();
  let changed = false;

  db.creatorReportSchedules.forEach((schedule) => {
    if (!schedule.enabled || schedule.userId !== userId || !schedule.nextSendAt) {
      return;
    }

    let nextSendAt = new Date(schedule.nextSendAt).getTime();

    if (Number.isNaN(nextSendAt)) {
      schedule.nextSendAt = getNextSendAt(schedule.frequency);
      changed = true;
      return;
    }

    while (nextSendAt <= now) {
      const deliveredAt = new Date(nextSendAt).toISOString();
      const delivery: CreatorReportDeliveryRecord = {
        id: createId("rpd"),
        userId: schedule.userId,
        destinationEmail: schedule.destinationEmail,
        frequency: schedule.frequency,
        format: schedule.format,
        range: schedule.range,
        deliveredAt,
        status: "sent",
      };

      db.creatorReportDeliveries.unshift(delivery);
      schedule.lastSentAt = deliveredAt;
      schedule.updatedAt = new Date().toISOString();
      schedule.nextSendAt = getNextSendAt(schedule.frequency, new Date(deliveredAt));
      nextSendAt = new Date(schedule.nextSendAt).getTime();
      changed = true;
    }
  });

  if (db.creatorReportDeliveries.length > 100) {
    db.creatorReportDeliveries = db.creatorReportDeliveries.slice(0, 100);
    changed = true;
  }

  return changed;
}

function buildPayload(db: MotionDb, userId: string) {
  const schedule =
    db.creatorReportSchedules.find((entry) => entry.userId === userId) ?? null;
  const deliveries = db.creatorReportDeliveries
    .filter((entry) => entry.userId === userId)
    .sort(
      (a, b) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime(),
    )
    .slice(0, 8)
    .map((delivery) => ({
      ...delivery,
      time: formatRelativeTime(delivery.deliveredAt),
    }));

  return { schedule, deliveries };
}

export async function GET(request: Request) {
  const currentUser = await getAuthUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUser.accountType !== "creator") {
    return NextResponse.json(
      { error: "Creator report schedules are only available for creator accounts." },
      { status: 403 },
    );
  }

  const payload = await updateDb((db) => {
    processDueSchedules(db, currentUser.id);
    return buildPayload(db, currentUser.id);
  });

  return NextResponse.json(payload);
}

export async function PUT(request: Request) {
  const currentUser = await getAuthUser(request);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentUser.accountType !== "creator") {
    return NextResponse.json(
      { error: "Creator report schedules are only available for creator accounts." },
      { status: 403 },
    );
  }

  let body: ScheduleBody;

  try {
    body = (await request.json()) as ScheduleBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const destinationEmail = body.destinationEmail?.trim().toLowerCase() ?? "";
  const enabled = body.enabled === true;
  const frequency = parseFrequency(body.frequency);
  const format = parseFormat(body.format);
  const range = parseRange(body.range);

  if (!destinationEmail || !isValidEmail(destinationEmail)) {
    return NextResponse.json(
      { error: "Enter a valid destination email." },
      { status: 400 },
    );
  }

  const payload = await updateDb((db) => {
    processDueSchedules(db, currentUser.id);

    const nowIso = new Date().toISOString();
    let schedule = db.creatorReportSchedules.find(
      (entry) => entry.userId === currentUser.id,
    );

    if (!schedule) {
      schedule = {
        id: createId("rps"),
        userId: currentUser.id,
        destinationEmail,
        frequency,
        format,
        range,
        enabled,
        createdAt: nowIso,
        updatedAt: nowIso,
        lastSentAt: undefined,
        nextSendAt: enabled ? getNextSendAt(frequency) : undefined,
      } satisfies CreatorReportScheduleRecord;
      db.creatorReportSchedules.push(schedule);
    } else {
      schedule.destinationEmail = destinationEmail;
      schedule.frequency = frequency;
      schedule.format = format;
      schedule.range = range;
      schedule.enabled = enabled;
      schedule.updatedAt = nowIso;
      schedule.nextSendAt = enabled ? getNextSendAt(frequency) : undefined;
    }

    return buildPayload(db, currentUser.id);
  });

  return NextResponse.json(payload);
}
