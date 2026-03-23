"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AccountType = "public" | "creator";
type AnalyticsRange = "7d" | "30d" | "90d";
type CreatorReportFrequency = "daily" | "weekly" | "monthly";
type CreatorReportFormat = "csv" | "json" | "excel" | "pdf";

type User = {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatarGradient: string;
  avatarUrl?: string;
  accountType?: AccountType;
};

type AnalyticsDashboard = {
  summary: {
    range: AnalyticsRange;
    rangeDays: number;
    postViews: number;
    likes: number;
    engagementRate: number;
    followerGrowth: number;
    followerCount: number;
    followingCount: number;
    publishedPosts: number;
    comments: number;
    shares: number;
  };
  growthSeries: {
    label: string;
    shortLabel: string;
    gained: number;
  }[];
  activeTimes: {
    label: string;
    audience: number;
  }[];
  activityHeatmap: {
    dayLabel: string;
    slots: {
      key: string;
      label: string;
      value: number;
    }[];
  }[];
  recentViewers: {
    id: string;
    viewerName: string;
    viewerHandle: string;
    viewerAvatarGradient: string;
    viewerAvatarUrl?: string | null;
    time: string;
  }[];
  topPosts: {
    id: string;
    kind: "Photo" | "Reel";
    caption: string;
    timeAgo: string;
    mediaUrl?: string;
    mediaType?: "image" | "video";
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
  }[];
};

type CreatorReportSchedule = {
  id: string;
  destinationEmail: string;
  frequency: CreatorReportFrequency;
  format: CreatorReportFormat;
  range: AnalyticsRange;
  enabled: boolean;
  lastSentAt?: string;
  nextSendAt?: string;
};

type CreatorReportDelivery = {
  id: string;
  destinationEmail: string;
  frequency: CreatorReportFrequency;
  format: CreatorReportFormat;
  range: AnalyticsRange;
  deliveredAt: string;
  status: "sent";
  time: string;
};

type CreatorReportPayload = {
  schedule: CreatorReportSchedule | null;
  deliveries: CreatorReportDelivery[];
};

type CreatorReportDraft = {
  enabled: boolean;
  destinationEmail: string;
  frequency: CreatorReportFrequency;
  format: CreatorReportFormat;
  range: AnalyticsRange;
};

const RANGE_OPTIONS: { id: AnalyticsRange; label: string }[] = [
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "90d", label: "90d" },
];

const REPORT_FREQUENCY_OPTIONS: {
  id: CreatorReportFrequency;
  label: string;
}[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

const REPORT_FORMAT_OPTIONS: {
  id: CreatorReportFormat;
  label: string;
}[] = [
  { id: "pdf", label: "PDF" },
  { id: "excel", label: "Excel" },
  { id: "csv", label: "CSV" },
  { id: "json", label: "JSON" },
];

type ExportSection = {
  title: string;
  headers: string[];
  rows: (string | number)[][];
};

async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }

  return payload;
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function escapeCsvCell(value: string | number): string {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }
  return stringValue;
}

function escapeHtml(value: string | number): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildExportSections(dashboard: AnalyticsDashboard): ExportSection[] {
  return [
    {
      title: "Summary",
      headers: ["Metric", "Value"],
      rows: [
        ["Post Views", dashboard.summary.postViews],
        ["Likes", dashboard.summary.likes],
        ["Comments", dashboard.summary.comments],
        ["Shares", dashboard.summary.shares],
        ["Engagement Rate", `${dashboard.summary.engagementRate.toFixed(1)}%`],
        ["Follower Growth", dashboard.summary.followerGrowth],
        ["Followers", dashboard.summary.followerCount],
        ["Following", dashboard.summary.followingCount],
        ["Published Posts", dashboard.summary.publishedPosts],
      ],
    },
    {
      title: "Follower Growth Series",
      headers: ["Date", "New Followers"],
      rows: dashboard.growthSeries.map((point) => [point.label, point.gained]),
    },
    {
      title: "Most Active Audience Times",
      headers: ["Time Window", "Signals"],
      rows: dashboard.activeTimes.map((time) => [time.label, time.audience]),
    },
    {
      title: "Audience Heatmap",
      headers: ["Day", "Time Slot", "Signals"],
      rows: dashboard.activityHeatmap.flatMap((day) =>
        day.slots.map((slot) => [day.dayLabel, slot.label, slot.value]),
      ),
    },
    {
      title: "Top Content",
      headers: [
        "Type",
        "Caption",
        "Posted",
        "Views",
        "Likes",
        "Comments",
        "Shares",
        "Engagement Rate",
      ],
      rows: dashboard.topPosts.map((post) => [
        post.kind,
        post.caption,
        post.timeAgo,
        post.views,
        post.likes,
        post.comments,
        post.shares,
        `${post.engagementRate.toFixed(1)}%`,
      ]),
    },
    {
      title: "Recent Profile Activity",
      headers: ["Viewer", "Handle", "Viewed"],
      rows: dashboard.recentViewers.map((viewer) => [
        viewer.viewerName,
        `@${viewer.viewerHandle}`,
        viewer.time,
      ]),
    },
  ];
}

function buildAnalyticsCsv(
  dashboard: AnalyticsDashboard,
  user: User,
  exportedAt: string,
): string {
  const rows: (string | number)[][] = [
    ["Creator Studio Export"],
    ["Creator", user.name],
    ["Handle", `@${user.handle}`],
    ["Exported At", exportedAt],
    ["Range", dashboard.summary.range],
    ["Range Days", dashboard.summary.rangeDays],
  ];

  buildExportSections(dashboard).forEach((section) => {
    rows.push([], [section.title], section.headers, ...section.rows);
  });

  return rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n");
}

function buildAnalyticsExcel(
  dashboard: AnalyticsDashboard,
  user: User,
  exportedAt: string,
): string {
  const sections = buildExportSections(dashboard)
    .map(
      (section) => `
        <table>
          <thead>
            <tr><th class="section-title" colspan="${section.headers.length}">${escapeHtml(section.title)}</th></tr>
            <tr>${section.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${section.rows
              .map(
                (row) =>
                  `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
              )
              .join("")}
          </tbody>
        </table>
      `,
    )
    .join("");

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body {
          font-family: Arial, sans-serif;
          background: #0f172a;
          color: #0f172a;
          margin: 24px;
        }
        .meta {
          margin-bottom: 24px;
          padding: 18px 20px;
          background: #e2e8f0;
          border-radius: 16px;
        }
        h1 {
          margin: 0 0 12px;
          font-size: 26px;
        }
        p {
          margin: 4px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          background: #ffffff;
        }
        th,
        td {
          border: 1px solid #cbd5e1;
          padding: 10px 12px;
          text-align: left;
          vertical-align: top;
        }
        th {
          background: #e2e8f0;
          font-weight: 700;
        }
        .section-title {
          background: #bfdbfe;
          color: #0f172a;
          font-size: 14px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
      </style>
    </head>
    <body>
      <section class="meta">
        <h1>Motion Creator Studio Export</h1>
        <p><strong>Creator:</strong> ${escapeHtml(user.name)}</p>
        <p><strong>Handle:</strong> ${escapeHtml(`@${user.handle}`)}</p>
        <p><strong>Exported At:</strong> ${escapeHtml(exportedAt)}</p>
        <p><strong>Range:</strong> ${escapeHtml(dashboard.summary.range)}</p>
      </section>
      ${sections}
    </body>
  </html>`;
}

function buildAnalyticsPdfDocument(
  dashboard: AnalyticsDashboard,
  user: User,
  exportedAt: string,
): string {
  const summaryCards = [
    ["Post Views", formatCompact(dashboard.summary.postViews)],
    ["Likes", formatCompact(dashboard.summary.likes)],
    ["Engagement Rate", `${dashboard.summary.engagementRate.toFixed(1)}%`],
    ["Follower Growth", `+${formatCompact(dashboard.summary.followerGrowth)}`],
  ]
    .map(
      ([label, value]) => `
        <div class="summary-card">
          <p>${escapeHtml(label)}</p>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `,
    )
    .join("");

  const sections = buildExportSections(dashboard)
    .map(
      (section) => `
        <section class="report-section">
          <h2>${escapeHtml(section.title)}</h2>
          <table>
            <thead>
              <tr>${section.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${
                section.rows.length > 0
                  ? section.rows
                      .map(
                        (row) =>
                          `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
                      )
                      .join("")
                  : `<tr><td colspan="${section.headers.length}">No data yet.</td></tr>`
              }
            </tbody>
          </table>
        </section>
      `,
    )
    .join("");

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Motion Creator Studio Report</title>
      <style>
        :root {
          color-scheme: light;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 32px;
          font-family: Arial, sans-serif;
          color: #0f172a;
          background: #f8fafc;
        }
        .hero {
          padding: 28px;
          border-radius: 28px;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: white;
        }
        .eyebrow {
          margin: 0;
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #bae6fd;
        }
        h1 {
          margin: 12px 0 8px;
          font-size: 32px;
        }
        .meta {
          margin: 0;
          color: #cbd5e1;
          font-size: 14px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin: 24px 0 0;
        }
        .summary-card {
          padding: 18px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.08);
        }
        .summary-card p {
          margin: 0;
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #cbd5e1;
        }
        .summary-card strong {
          display: block;
          margin-top: 10px;
          font-size: 24px;
        }
        .report-section {
          margin-top: 28px;
          page-break-inside: avoid;
        }
        .report-section h2 {
          margin: 0 0 12px;
          font-size: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 16px;
          overflow: hidden;
        }
        th,
        td {
          border: 1px solid #e2e8f0;
          padding: 10px 12px;
          text-align: left;
          vertical-align: top;
          font-size: 13px;
        }
        th {
          background: #eff6ff;
          font-weight: 700;
        }
        @media print {
          body {
            padding: 18px;
            background: white;
          }
        }
      </style>
    </head>
    <body>
      <section class="hero">
        <p class="eyebrow">Creator Studio</p>
        <h1>${escapeHtml(user.name)} analytics report</h1>
        <p class="meta">${escapeHtml(`@${user.handle}`)} | Exported ${escapeHtml(exportedAt)} | ${escapeHtml(dashboard.summary.rangeDays)} day range</p>
        <div class="summary-grid">${summaryCards}</div>
      </section>
      ${sections}
      <script>
        window.addEventListener("load", () => {
          window.setTimeout(() => {
            window.print();
          }, 300);
        });
        window.onafterprint = () => window.close();
      </script>
    </body>
  </html>`;
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatDateTimeLabel(value?: string): string {
  if (!value) {
    return "Not scheduled";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
        {label}
      </p>
      <p className="mt-4 text-4xl font-semibold tracking-tight text-white">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-400">{hint}</p> : null}
    </div>
  );
}

function RangeButton({
  id,
  label,
  active,
  disabled,
  onClick,
}: {
  id: AnalyticsRange;
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: (value: AnalyticsRange) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      disabled={disabled}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-white text-slate-900 shadow-[0_10px_30px_rgba(255,255,255,0.16)]"
          : "border border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:text-white"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {label}
    </button>
  );
}

function ChoiceButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
          : "border border-[var(--line)] bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {label}
    </button>
  );
}

function TopPostPreview({
  post,
}: {
  post: AnalyticsDashboard["topPosts"][number];
}) {
  if (post.mediaUrl && post.mediaType === "image") {
    return (
      <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
        <Image
          src={post.mediaUrl}
          alt={post.caption || `${post.kind} post`}
          fill
          className="object-cover"
        />
      </div>
    );
  }

  if (post.mediaUrl && post.mediaType === "video") {
    return (
      <div className="h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
        <video
          src={post.mediaUrl}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      </div>
    );
  }

  return (
    <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(96,165,250,0.28),rgba(14,165,233,0.08))] text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
      {post.kind}
    </div>
  );
}

function buildLinePath(values: number[], width: number, height: number, padding: number) {
  if (values.length === 0) {
    return { linePath: "", areaPath: "", points: [] as { x: number; y: number; value: number }[] };
  }

  const maxValue = Math.max(1, ...values);
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;
  const step = values.length === 1 ? 0 : graphWidth / (values.length - 1);

  const points = values.map((value, index) => {
    const x = padding + index * step;
    const y = padding + graphHeight - (value / maxValue) * graphHeight;
    return { x, y, value };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : "";

  return { linePath, areaPath, points };
}

function getHeatColor(value: number, maxValue: number): string {
  if (value <= 0 || maxValue <= 0) {
    return "rgba(148, 163, 184, 0.12)";
  }

  const intensity = Math.min(1, value / maxValue);
  const alpha = 0.18 + intensity * 0.82;
  return `rgba(56, 189, 248, ${alpha.toFixed(2)})`;
}

export default function CreatorStudioPage() {
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [reportSchedule, setReportSchedule] = useState<CreatorReportSchedule | null>(null);
  const [reportDeliveries, setReportDeliveries] = useState<CreatorReportDelivery[]>([]);
  const [reportDraft, setReportDraft] = useState<CreatorReportDraft | null>(null);
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [userLoading, setUserLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      setUserLoading(true);
      setError(null);

      try {
        const mePayload = await apiGet<{ user: User }>("/api/auth/me");
        if (!active) {
          return;
        }
        setUser(mePayload.user);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load creator studio.",
        );
      } finally {
        if (active) {
          setUserLoading(false);
        }
      }
    };

    void loadUser();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user || user.accountType !== "creator") {
      return;
    }

    let active = true;

    const loadDashboard = async () => {
      setDashboardLoading(true);
      setError(null);

      try {
        const analyticsPayload = await apiGet<AnalyticsDashboard>(
          `/api/creator/analytics?range=${range}`,
        );
        if (!active) {
          return;
        }
        setDashboard(analyticsPayload);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load creator studio.",
        );
      } finally {
        if (active) {
          setDashboardLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [range, user]);

  useEffect(() => {
    if (!user || user.accountType !== "creator") {
      return;
    }

    let active = true;

    const loadSchedule = async () => {
      setScheduleLoading(true);

      try {
        const payload = await apiGet<CreatorReportPayload>("/api/creator/report-schedule");
        if (!active) {
          return;
        }
        setReportSchedule(payload.schedule);
        setReportDeliveries(payload.deliveries ?? []);
        setReportDraft({
          enabled: payload.schedule?.enabled ?? false,
          destinationEmail: payload.schedule?.destinationEmail ?? user.email,
          frequency: payload.schedule?.frequency ?? "weekly",
          format: payload.schedule?.format ?? "pdf",
          range: payload.schedule?.range ?? "30d",
        });
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load report schedule.",
        );
      } finally {
        if (active) {
          setScheduleLoading(false);
        }
      }
    };

    void loadSchedule();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!downloadMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDownloadMessage(null);
    }, 2800);

    return () => window.clearTimeout(timeoutId);
  }, [downloadMessage]);

  useEffect(() => {
    if (!scheduleMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setScheduleMessage(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [scheduleMessage]);

  const maxHeatValue = useMemo(
    () =>
      Math.max(
        0,
        ...(
          dashboard?.activityHeatmap.flatMap((day) =>
            day.slots.map((slot) => slot.value),
          ) ?? []
        ),
      ),
    [dashboard],
  );

  const chartModel = useMemo(() => {
    const values = dashboard?.growthSeries.map((point) => point.gained) ?? [];
    return buildLinePath(values, 820, 300, 26);
  }, [dashboard]);

  const growthLabelStep = useMemo(() => {
    const count = dashboard?.growthSeries.length ?? 0;
    if (count <= 7) {
      return 1;
    }
    if (count <= 30) {
      return 5;
    }
    return 15;
  }, [dashboard]);

  const handleExport = (format: CreatorReportFormat) => {
    if (!dashboard || !user) {
      return;
    }

    try {
      const exportedAt = new Date().toISOString();
      const fileBase = `motion-creator-analytics-${dashboard.summary.range}`;

      if (format === "csv") {
        const csv = buildAnalyticsCsv(dashboard, user, exportedAt);
        downloadFile(`${fileBase}.csv`, csv, "text/csv;charset=utf-8");
        setError(null);
        setDownloadMessage("CSV export downloaded.");
        return;
      }

      if (format === "json") {
        const json = JSON.stringify(
          {
            exportedAt,
            creator: {
              id: user.id,
              name: user.name,
              handle: user.handle,
            },
            dashboard,
          },
          null,
          2,
        );
        downloadFile(
          `${fileBase}.json`,
          json,
          "application/json;charset=utf-8",
        );
        setError(null);
        setDownloadMessage("JSON export downloaded.");
        return;
      }

      if (format === "excel") {
        const workbook = buildAnalyticsExcel(dashboard, user, exportedAt);
        downloadFile(
          `${fileBase}.xls`,
          workbook,
          "application/vnd.ms-excel;charset=utf-8",
        );
        setError(null);
        setDownloadMessage("Excel export downloaded.");
        return;
      }

      const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");
      if (!printWindow) {
        throw new Error("Allow pop-ups to export the PDF report.");
      }
      printWindow.document.open();
      printWindow.document.write(buildAnalyticsPdfDocument(dashboard, user, exportedAt));
      printWindow.document.close();
      setError(null);
      setDownloadMessage("PDF report opened. Choose Save as PDF in the print dialog.");
    } catch (exportError) {
      setDownloadMessage(null);
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Failed to export creator analytics.",
      );
    }
  };

  const handleSaveSchedule = async () => {
    if (!reportDraft) {
      return;
    }

    setScheduleSaving(true);

    try {
      const response = await fetch("/api/creator/report-schedule", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reportDraft),
      });
      const payload = (await response.json().catch(() => ({}))) as CreatorReportPayload & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save report schedule.");
      }

      setReportSchedule(payload.schedule);
      setReportDeliveries(payload.deliveries ?? []);
      setScheduleMessage(
        reportDraft.enabled
          ? "Scheduled email reports updated."
          : "Scheduled email reports paused.",
      );
      setError(null);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save report schedule.",
      );
      setScheduleMessage(null);
    } finally {
      setScheduleSaving(false);
    }
  };

  const effectiveReportDraft: CreatorReportDraft = reportDraft ?? {
    enabled: reportSchedule?.enabled ?? false,
    destinationEmail: reportSchedule?.destinationEmail ?? user?.email ?? "",
    frequency: reportSchedule?.frequency ?? "weekly",
    format: reportSchedule?.format ?? "pdf",
    range: reportSchedule?.range ?? range,
  };

  const initialLoading =
    userLoading || (user?.accountType === "creator" && !dashboard && dashboardLoading);

  if (initialLoading) {
    return (
      <main className="motion-shell min-h-screen px-4 py-8">
        <div className="motion-surface mx-auto max-w-6xl p-6">Loading creator studio...</div>
      </main>
    );
  }

  if (error && !user) {
    return (
      <main className="motion-shell min-h-screen px-4 py-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <Link
            href="/profile"
            className="inline-flex w-fit items-center rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Back to Profile
          </Link>
          <section className="motion-surface p-6">
            <h1
              className="text-2xl font-semibold text-slate-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Creator Studio
            </h1>
            <p className="mt-3 text-sm text-rose-600">{error}</p>
          </section>
        </div>
      </main>
    );
  }

  if (!user || user.accountType !== "creator" || !dashboard) {
    return (
      <main className="motion-shell min-h-screen px-4 py-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <Link
            href="/profile"
            className="inline-flex w-fit items-center rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Back to Profile
          </Link>
          <section className="motion-surface overflow-hidden p-0">
            <div className="bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.22),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))] px-6 py-8 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200/80">
                Creator Studio
              </p>
              <h1
                className="mt-3 text-3xl font-semibold"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Upgrade to Creator
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">
                This dashboard is only available for creator accounts. Switch your
                account type in Settings to unlock analytics and audience insights.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/profile"
                  className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900"
                >
                  Open Profile Settings
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Back to Feed
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="motion-shell min-h-screen px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/profile"
            className="inline-flex items-center rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            Back to Profile
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            Back to Feed
          </Link>
        </div>

        <section className="motion-surface overflow-hidden p-0">
          <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(17,24,39,0.94))] px-6 py-6 text-white">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px] opacity-35" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200/80">
                  Creator Studio
                </p>
                <h1
                  className="mt-3 text-4xl font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {user.name}, here is the real picture.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">
                  Track what people watch, what earns engagement, when your audience
                  shows up, and which posts are carrying your profile.
                </p>
              </div>

              <div className="flex flex-col gap-4 lg:items-end">
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
                    {RANGE_OPTIONS.map((option) => (
                      <RangeButton
                        key={option.id}
                        id={option.id}
                        label={option.label}
                        active={range === option.id}
                        disabled={dashboardLoading}
                        onClick={setRange}
                      />
                    ))}
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
                    <button
                      type="button"
                      onClick={() => handleExport("pdf")}
                      className="rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                    >
                      Export PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport("excel")}
                      className="rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                    >
                      Download Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport("csv")}
                      className="rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                    >
                      Export CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport("json")}
                      className="rounded-full border border-white/10 bg-white text-sm font-semibold text-slate-900 px-4 py-2 transition hover:bg-slate-100"
                    >
                      Download JSON
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-[28px] border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                  {user.avatarUrl ? (
                    <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/10">
                      <Image
                        src={user.avatarUrl}
                        alt={user.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="grid h-14 w-14 place-items-center rounded-2xl text-sm font-semibold text-white"
                      style={{ background: user.avatarGradient }}
                    >
                      {user.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">{user.name}</p>
                    <p className="text-xs text-slate-300">@{user.handle}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-sky-200/80">
                      {dashboardLoading ? "Refreshing studio..." : `${dashboard.summary.rangeDays} day view`}
                    </p>
                    {downloadMessage ? (
                      <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                        {downloadMessage}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`grid gap-4 md:grid-cols-2 xl:grid-cols-4 ${dashboardLoading ? "opacity-75" : ""}`}>
          <StatCard
            label="Post Views"
            value={formatCompact(dashboard.summary.postViews)}
            hint={`${dashboard.summary.publishedPosts} posts in ${dashboard.summary.rangeDays} days`}
          />
          <StatCard
            label="Likes"
            value={formatCompact(dashboard.summary.likes)}
            hint={`${formatCompact(dashboard.summary.comments)} comments and ${formatCompact(dashboard.summary.shares)} shares`}
          />
          <StatCard
            label="Engagement Rate"
            value={`${dashboard.summary.engagementRate.toFixed(1)}%`}
            hint="Interactions divided by views"
          />
          <StatCard
            label="Follower Growth"
            value={`+${formatCompact(dashboard.summary.followerGrowth)}`}
            hint={`Across the last ${dashboard.summary.rangeDays} days`}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="motion-surface overflow-hidden p-0">
            <div className="border-b border-white/8 bg-[linear-gradient(135deg,rgba(96,165,250,0.12),rgba(15,23,42,0))] px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Scheduled Reports
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                Email creator reports automatically
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Choose where the report goes, how often it should send, and which
                format the export should use.
              </p>
            </div>
            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Destination Email
                  </span>
                  <input
                    type="email"
                    value={effectiveReportDraft.destinationEmail}
                    onChange={(event) =>
                      setReportDraft((current) => ({
                        ...(current ?? effectiveReportDraft),
                        destinationEmail: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    placeholder="creator@motion.app"
                  />
                </label>

                <div className="rounded-[24px] border border-[var(--line)] bg-slate-50/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Status
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setReportDraft((current) => ({
                        ...(current ?? effectiveReportDraft),
                        enabled: !(current ?? effectiveReportDraft).enabled,
                      }))
                    }
                    className={`mt-3 inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                      effectiveReportDraft.enabled
                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                        : "bg-slate-900 text-white hover:bg-slate-700"
                    }`}
                  >
                    {effectiveReportDraft.enabled ? "Enabled" : "Paused"}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Frequency
                </p>
                <div className="flex flex-wrap gap-2">
                  {REPORT_FREQUENCY_OPTIONS.map((option) => (
                    <ChoiceButton
                      key={option.id}
                      label={option.label}
                      active={effectiveReportDraft.frequency === option.id}
                      disabled={scheduleSaving}
                      onClick={() =>
                        setReportDraft((current) => ({
                          ...(current ?? effectiveReportDraft),
                          frequency: option.id,
                        }))
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Format
                </p>
                <div className="flex flex-wrap gap-2">
                  {REPORT_FORMAT_OPTIONS.map((option) => (
                    <ChoiceButton
                      key={option.id}
                      label={option.label}
                      active={effectiveReportDraft.format === option.id}
                      disabled={scheduleSaving}
                      onClick={() =>
                        setReportDraft((current) => ({
                          ...(current ?? effectiveReportDraft),
                          format: option.id,
                        }))
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Report Range
                </p>
                <div className="flex flex-wrap gap-2">
                  {RANGE_OPTIONS.map((option) => (
                    <ChoiceButton
                      key={`schedule-${option.id}`}
                      label={option.label}
                      active={effectiveReportDraft.range === option.id}
                      disabled={scheduleSaving}
                      onClick={() =>
                        setReportDraft((current) => ({
                          ...(current ?? effectiveReportDraft),
                          range: option.id,
                        }))
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[var(--line)] bg-slate-50/70 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {effectiveReportDraft.enabled
                      ? "Reports will keep sending on schedule."
                      : "Reports are paused until you enable them."}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Current schedule: {effectiveReportDraft.frequency} | {effectiveReportDraft.format.toUpperCase()} | {effectiveReportDraft.range}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  disabled={scheduleSaving || scheduleLoading}
                  className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {scheduleSaving ? "Saving..." : "Save Schedule"}
                </button>
              </div>

              {scheduleMessage ? (
                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {scheduleMessage}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-5">
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="motion-surface p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Next Send
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-900">
                  {formatDateTimeLabel(reportSchedule?.nextSendAt)}
                </p>
              </div>
              <div className="motion-surface p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Last Sent
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-900">
                  {formatDateTimeLabel(reportSchedule?.lastSentAt)}
                </p>
              </div>
            </section>

            <section className="motion-surface overflow-hidden p-0">
              <div className="border-b border-white/8 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(15,23,42,0))] px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Delivery History
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  Recent scheduled sends
                </h2>
              </div>
              <div className="space-y-3 p-5">
                {reportDeliveries.length > 0 ? (
                  reportDeliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="rounded-[24px] border border-[var(--line)] bg-white/70 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {delivery.format.toUpperCase()} report sent
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {delivery.destinationEmail}
                          </p>
                        </div>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                          Sent
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                        <span>{delivery.time}</span>
                        <span>|</span>
                        <span>{delivery.frequency}</span>
                        <span>|</span>
                        <span>{delivery.range}</span>
                        <span>|</span>
                        <span>{formatDateTimeLabel(delivery.deliveredAt)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No scheduled deliveries yet. Save a schedule to start building a report history.
                  </p>
                )}
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="motion-surface overflow-hidden p-0">
            <div className="border-b border-white/8 bg-[linear-gradient(135deg,rgba(96,165,250,0.14),rgba(15,23,42,0))] px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Follower Growth
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                {dashboard.summary.rangeDays}-day trend
              </h2>
            </div>
            <div className="p-5">
              {dashboard.growthSeries.length > 0 ? (
                <div className="space-y-4">
                  <svg
                    viewBox="0 0 820 300"
                    className="h-[18rem] w-full"
                    aria-label="Follower growth chart"
                  >
                    <defs>
                      <linearGradient id="growth-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(59,130,246,0.36)" />
                        <stop offset="100%" stopColor="rgba(59,130,246,0)" />
                      </linearGradient>
                    </defs>

                    {[0, 1, 2, 3].map((index) => {
                      const y = 26 + ((300 - 52) / 3) * index;
                      return (
                        <line
                          key={index}
                          x1="26"
                          y1={y}
                          x2="794"
                          y2={y}
                          stroke="rgba(148,163,184,0.18)"
                          strokeDasharray="4 8"
                        />
                      );
                    })}

                    {chartModel.areaPath ? (
                      <path d={chartModel.areaPath} fill="url(#growth-fill)" />
                    ) : null}
                    {chartModel.linePath ? (
                      <path
                        d={chartModel.linePath}
                        fill="none"
                        stroke="rgb(59,130,246)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : null}
                    {chartModel.points.map((point, index) => (
                      <g key={`${point.x}-${point.y}-${index}`}>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="5"
                          fill="white"
                          stroke="rgb(59,130,246)"
                          strokeWidth="3"
                        />
                        <title>{`${dashboard.growthSeries[index]?.label ?? ""}: ${point.value} new followers`}</title>
                      </g>
                    ))}
                  </svg>

                  <div className="grid grid-cols-[repeat(auto-fit,minmax(2.5rem,1fr))] gap-2">
                    {dashboard.growthSeries.map((point, index) => {
                      const shouldShow =
                        index === 0 ||
                        index === dashboard.growthSeries.length - 1 ||
                        index % growthLabelStep === 0;

                      return (
                        <span
                          key={`${point.label}-${index}`}
                          className="text-center text-[11px] uppercase tracking-[0.16em] text-slate-400"
                        >
                          {shouldShow ? point.shortLabel : ""}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Growth will appear here as new followers come in.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <section className="motion-surface overflow-hidden p-0">
              <div className="border-b border-white/8 bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(15,23,42,0))] px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Audience Insights
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Most active times</h2>
              </div>
              <div className="space-y-4 p-5">
                {dashboard.activeTimes.length > 0 ? (
                  dashboard.activeTimes.map((time) => {
                    const maxAudience = Math.max(
                      1,
                      ...dashboard.activeTimes.map((entry) => entry.audience),
                    );
                    const width = Math.max(
                      18,
                      Math.round((time.audience / maxAudience) * 100),
                    );

                    return (
                      <div key={time.label} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-semibold text-slate-900">{time.label}</span>
                          <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            {time.audience} signals
                          </span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-100">
                          <div
                            className="h-3 rounded-full bg-[linear-gradient(90deg,rgba(14,165,233,1),rgba(59,130,246,0.88))]"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500">
                    Audience activity will appear here once followers start engaging.
                  </p>
                )}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="motion-surface p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Followers
                </p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">
                  {formatCompact(dashboard.summary.followerCount)}
                </p>
              </div>
              <div className="motion-surface p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Following
                </p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">
                  {formatCompact(dashboard.summary.followingCount)}
                </p>
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
          <div className="motion-surface overflow-hidden p-0">
            <div className="border-b border-white/8 bg-[linear-gradient(135deg,rgba(96,165,250,0.12),rgba(15,23,42,0))] px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Audience Heatmap
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                Weekly behavior pattern
              </h2>
            </div>
            <div className="overflow-x-auto p-5">
              <div className="min-w-[32rem]">
                <div className="grid grid-cols-[5rem_repeat(7,minmax(0,1fr))] gap-2">
                  <div />
                  {dashboard.activityHeatmap.map((day) => (
                    <div
                      key={day.dayLabel}
                      className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400"
                    >
                      {day.dayLabel}
                    </div>
                  ))}

                  {(dashboard.activityHeatmap[0]?.slots ?? []).map((slot, slotIndex) => (
                    <div key={slot.key} className="contents">
                      <div className="flex items-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {slot.label}
                      </div>
                      {dashboard.activityHeatmap.map((day) => {
                        const cell = day.slots[slotIndex];
                        return (
                          <div
                            key={`${day.dayLabel}-${cell.key}`}
                            className="aspect-square rounded-xl border border-white/8"
                            style={{
                              backgroundColor: getHeatColor(cell.value, maxHeatValue),
                            }}
                            title={`${day.dayLabel} ${cell.label}: ${cell.value} activity signals`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="motion-surface overflow-hidden p-0">
            <div className="border-b border-white/8 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(15,23,42,0))] px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Recent Profile Activity
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">People checking your profile</h2>
            </div>
            <div className="space-y-3 p-5">
              {dashboard.recentViewers.length > 0 ? (
                dashboard.recentViewers.map((viewer) => (
                  <div
                    key={viewer.id}
                    className="flex items-center justify-between gap-4 rounded-[24px] border border-[var(--line)] bg-white/70 p-3"
                  >
                    <div className="flex items-center gap-3">
                      {viewer.viewerAvatarUrl ? (
                        <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-[var(--line)]">
                          <Image
                            src={viewer.viewerAvatarUrl}
                            alt={viewer.viewerName}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className="grid h-12 w-12 place-items-center rounded-2xl text-xs font-semibold text-white"
                          style={{ background: viewer.viewerAvatarGradient }}
                        >
                          {viewer.viewerName
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {viewer.viewerName}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          @{viewer.viewerHandle}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      {viewer.time}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No recent profile viewers yet.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="motion-surface overflow-hidden p-0">
          <div className="border-b border-white/8 bg-[linear-gradient(135deg,rgba(96,165,250,0.12),rgba(15,23,42,0))] px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Top Content
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">What is carrying your profile</h2>
          </div>
          <div className="grid gap-3 p-5 md:grid-cols-2">
            {dashboard.topPosts.length > 0 ? (
              dashboard.topPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center gap-4 rounded-[24px] border border-[var(--line)] bg-white/70 p-3"
                >
                  <TopPostPreview post={post} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {post.caption || `${post.kind} post`}
                      </p>
                      <span className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        {post.timeAgo}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      <span>{formatCompact(post.views)} views</span>
                      <span>{formatCompact(post.likes)} likes</span>
                      <span>{formatCompact(post.comments)} comments</span>
                      <span>{formatCompact(post.shares)} shares</span>
                      <span>{post.engagementRate.toFixed(1)}% ER</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                Publish more content to see top-performing posts here.
              </p>
            )}
          </div>
        </section>

        {error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
