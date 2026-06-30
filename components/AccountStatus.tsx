"use client";

import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { AccountStatuses, PlatformAccountStatus } from "@/lib/types";

function StatusItem({
  label,
  status,
}: {
  label: string;
  status?: PlatformAccountStatus;
}) {
  const connected = Boolean(status?.connected);

  return (
    <article
      className={`rounded-lg border bg-white p-4 shadow-sm transition ${
        connected ? "border-emerald-200" : "border-amber-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
            connected
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {connected ? (
            <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
          ) : (
            <XCircle aria-hidden="true" className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-zinc-950">{label}</h3>
            <span
              className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold ${
                connected
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {connected ? "연결됨" : "연결 필요"}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {status?.message ?? "상태를 불러오는 중입니다."}
          </p>
        </div>
      </div>
    </article>
  );
}

export function AccountStatus() {
  const [status, setStatus] = useState<AccountStatuses | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStatus() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/accounts/status", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "계정 상태를 불러오지 못했습니다.");
        return;
      }

      setStatus(data as AccountStatuses);
    } catch {
      setError("계정 상태 요청 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStatus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-50 text-teal-700">
            <ShieldCheck aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Connections
            </p>
            <h2 className="text-lg font-semibold text-zinc-950">
              계정 연결 상태
            </h2>
          </div>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:text-zinc-400"
          type="button"
          onClick={loadStatus}
          disabled={isLoading}
          title="계정 상태 새로고침"
        >
          <RefreshCw
            aria-hidden="true"
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          새로고침
        </button>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
          <div className="flex items-start gap-2">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <StatusItem label="X" status={status?.x} />
        <StatusItem label="Threads" status={status?.threads} />
      </div>
    </section>
  );
}
