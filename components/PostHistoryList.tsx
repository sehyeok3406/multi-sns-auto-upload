"use client";

import { Clock3, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { PostHistoryEntry } from "@/lib/types";

const PLATFORM_LABEL: Record<string, string> = {
  x: "X",
  threads: "Threads",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PostHistoryList({ refreshToken }: { refreshToken: number }) {
  const [history, setHistory] = useState<PostHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadHistory() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/posts/history", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "게시 기록을 불러오지 못했습니다.");
        return;
      }

      setHistory(data.history ?? []);
    } catch {
      setError("게시 기록 요청 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadHistory();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshToken]);

  return (
    <aside>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock3 aria-hidden="true" className="h-5 w-5 text-teal-700" />
          <h2 className="text-lg font-semibold">최근 게시 기록</h2>
        </div>
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
          type="button"
          onClick={loadHistory}
          disabled={isLoading}
          title="게시 기록 새로고침"
        >
          <RefreshCw
            aria-hidden="true"
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {history.length === 0 && !isLoading ? (
          <p className="rounded-md border border-dashed border-zinc-300 px-3 py-8 text-center text-sm text-zinc-500">
            게시 기록이 없습니다.
          </p>
        ) : null}

        {history.map((entry) => (
          <article
            key={entry.id}
            className="rounded-lg border border-zinc-200 bg-[#fbfbf8] p-3"
          >
            <div className="flex flex-wrap gap-1.5">
              {entry.platforms.map((platform) => (
                <span
                  key={platform}
                  className="rounded-sm bg-zinc-900 px-2 py-1 text-xs font-semibold text-white"
                >
                  {PLATFORM_LABEL[platform]}
                </span>
              ))}
            </div>
            <p className="mt-3 line-clamp-4 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800">
              {entry.content}
            </p>
            <dl className="mt-3 space-y-1 text-xs text-zinc-600">
              <div className="flex justify-between gap-3">
                <dt>작성</dt>
                <dd>{formatDateTime(entry.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>요청</dt>
                <dd>{formatDateTime(entry.requestedAt)}</dd>
              </div>
            </dl>
            <div className="mt-3 space-y-1.5">
              {entry.results.map((result) => (
                <p
                  key={`${entry.id}-${result.platform}`}
                  className={`rounded-sm px-2 py-1 text-xs font-medium ${
                    result.success
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {PLATFORM_LABEL[result.platform]}:{" "}
                  {result.success ? "성공" : "실패"} - {result.message}
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}
