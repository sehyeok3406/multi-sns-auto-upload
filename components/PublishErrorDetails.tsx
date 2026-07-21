"use client";

import { AlertTriangle, Check, Clipboard } from "lucide-react";
import { useState } from "react";
import type { PublishErrorDetail } from "@/lib/types";

function formatValue(value: number | string | undefined) {
  if (value === undefined || value === "") {
    return "";
  }

  return String(value);
}

function formatDateTime(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

function buildErrorReport(detail: PublishErrorDetail) {
  const lines = [
    "[SNS auto upload 오류 정보]",
    `발생 시각: ${formatDateTime(detail.occurredAt) || "기록 없음"}`,
    `오류 키: ${detail.errorKey ?? "UNCLASSIFIED_ERROR"}`,
    `분류: ${detail.categoryLabel ?? detail.category ?? "확인 필요"}`,
    `제목: ${detail.displayTitle ?? detail.title ?? "오류 발생"}`,
    `요약: ${detail.summary ?? "기록 없음"}`,
    `출처: ${detail.source}`,
    `단계: ${detail.stageLabel ?? detail.stage ?? "기록 없음"}`,
    `항목: ${detail.itemLabel ?? "기록 없음"}`,
    `자동 시도: ${detail.attempts ? `${detail.attempts}회` : "기록 없음"}`,
    `HTTP: ${formatValue(detail.httpStatus) || "기록 없음"}`,
    `Code: ${formatValue(detail.code) || "기록 없음"}`,
    `Subcode: ${formatValue(detail.subcode) || "기록 없음"}`,
    `Type: ${detail.type ?? "기록 없음"}`,
    `Trace: ${detail.traceId ?? "기록 없음"}`,
    `API 제목: ${detail.title ?? "기록 없음"}`,
    `API 메시지: ${detail.userMessage ?? detail.message ?? "기록 없음"}`,
  ];

  if (detail.actions?.length) {
    lines.push("", "[권장 조치]");
    detail.actions.forEach((action, index) => {
      lines.push(`${index + 1}. ${action}`);
    });
  } else if (detail.retryHint) {
    lines.push("", `[권장 조치] ${detail.retryHint}`);
  }

  return lines.join("\n");
}

export function PublishErrorDetails({
  detail,
  compact = false,
}: {
  detail?: PublishErrorDetail;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (!detail) {
    return null;
  }

  const currentDetail = detail;
  const rows = [
    ["발생", formatDateTime(detail.occurredAt)],
    ["오류 키", detail.errorKey],
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
  const actions =
    detail.actions && detail.actions.length > 0
      ? detail.actions
      : detail.retryHint
        ? [detail.retryHint]
        : [];

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildErrorReport(currentDetail));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={`mt-2 overflow-hidden rounded-md border border-rose-200 bg-white text-zinc-900 ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      <div className={compact ? "p-2.5" : "p-3.5"}>
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-rose-100 text-rose-700">
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-semibold leading-5 text-rose-950">
                {detail.displayTitle ?? detail.title ?? "오류 상세 정보"}
              </p>
              {detail.categoryLabel ?? detail.category ? (
                <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
                  {detail.categoryLabel ?? detail.category}
                </span>
              ) : null}
              {detail.retryable !== undefined ? (
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                    detail.retryable
                      ? "bg-amber-100 text-amber-800"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {detail.retryable ? "재시도 가능" : "확인 후 재시도"}
                </span>
              ) : null}
            </div>
            {detail.summary ? (
              <p className="mt-1 break-words leading-5 text-zinc-700">
                {detail.summary}
              </p>
            ) : null}
          </div>
        </div>

        {actions.length > 0 ? (
          <div className="mt-3 rounded-md bg-amber-50 px-3 py-2.5 text-amber-950">
            <p className="font-semibold">확인 및 해결 방법</p>
            <ol className="mt-1.5 space-y-1.5">
              {actions.map((action, index) => (
                <li key={`${index}-${action}`} className="flex gap-2 leading-5">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-900">
                    {index + 1}
                  </span>
                  <span>{action}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>

      <details className="border-t border-rose-100 bg-zinc-50">
        <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100">
          개발자용 기술정보
        </summary>
        <div className="border-t border-zinc-200 p-3">
          {rows.length > 0 ? (
            <dl className="grid gap-1.5 text-xs sm:grid-cols-2">
              {rows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex min-w-0 items-center justify-between gap-2 rounded bg-white px-2 py-1.5 ring-1 ring-zinc-200"
                >
                  <dt className="shrink-0 font-semibold text-zinc-500">
                    {label}
                  </dt>
                  <dd className="truncate text-right font-medium text-zinc-900">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {apiMessage ? (
            <p className="mt-2 whitespace-pre-wrap break-words rounded bg-white px-2.5 py-2 text-xs leading-5 text-zinc-700 ring-1 ring-zinc-200">
              <span className="font-semibold text-zinc-900">API 메시지: </span>
              {apiMessage}
            </p>
          ) : null}

          <button
            className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-100"
            type="button"
            onClick={handleCopy}
          >
            {copied ? (
              <Check aria-hidden="true" className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Clipboard aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {copied ? "복사됨" : "오류 정보 복사"}
          </button>
        </div>
      </details>
    </div>
  );
}
