"use client";

import type { PublishErrorDetail } from "@/lib/types";

function formatValue(value: number | string | undefined) {
  if (value === undefined || value === "") {
    return "";
  }

  return String(value);
}

export function PublishErrorDetails({
  detail,
  compact = false,
}: {
  detail?: PublishErrorDetail;
  compact?: boolean;
}) {
  if (!detail) {
    return null;
  }

  const rows = [
    ["출처", detail.source],
    ["단계", detail.stageLabel ?? detail.stage],
    ["항목", detail.itemLabel],
    ["자동 시도", detail.attempts ? `${detail.attempts}회` : ""],
    ["HTTP", formatValue(detail.httpStatus)],
    ["Code", formatValue(detail.code)],
    ["Subcode", formatValue(detail.subcode)],
    ["Type", detail.type],
    ["Trace", detail.traceId],
  ].filter(([, value]) => Boolean(value));
  const apiMessage = detail.userMessage ?? detail.message;

  return (
    <div
      className={`mt-2 rounded-md border border-rose-200 bg-white/80 text-rose-900 ${
        compact ? "p-2" : "p-3"
      }`}
    >
      {rows.length > 0 ? (
        <dl className="grid gap-1.5 text-xs sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex min-w-0 items-center justify-between gap-2 rounded bg-rose-50 px-2 py-1"
            >
              <dt className="shrink-0 font-semibold text-rose-700">{label}</dt>
              <dd className="truncate text-right font-medium text-rose-950">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {apiMessage ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5">
          <span className="font-semibold">API 메시지: </span>
          {apiMessage}
        </p>
      ) : null}

      {detail.retryHint ? (
        <p className="mt-2 rounded bg-amber-50 px-2 py-1.5 text-xs font-medium leading-5 text-amber-800">
          {detail.retryHint}
        </p>
      ) : null}
    </div>
  );
}
