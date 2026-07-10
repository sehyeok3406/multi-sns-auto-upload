"use client";

import { Clock3, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { PublishErrorDetails } from "@/components/PublishErrorDetails";
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
    <aside className="xl:sticky xl:top-24 xl:self-start">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-50 text-teal-700">
            <Clock3 aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              History
            </p>
            <h2 className="text-lg font-semibold text-zinc-950">
              최근 게시 기록
            </h2>
          </div>
        </div>
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:text-zinc-400"
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
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {history.length === 0 && isLoading ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="h-4 w-20 animate-pulse rounded bg-zinc-200" />
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-zinc-100" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-100" />
            </div>
          </div>
        ) : null}

        {history.length === 0 && !isLoading ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-10 text-center shadow-sm">
            <p className="text-sm font-medium text-zinc-500">
              게시 기록이 없습니다.
            </p>
          </div>
        ) : null}

        {history.map((entry) => (
          <article
            key={entry.id}
            className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap gap-1.5">
              {entry.platforms.map((platform) => (
                <span
                  key={platform}
                  className="rounded-md bg-zinc-950 px-2 py-1 text-xs font-semibold text-white"
                >
                  {PLATFORM_LABEL[platform]}
                </span>
              ))}
              {entry.topicTag ? (
                <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
                  {entry.topicTag}
                </span>
              ) : null}
              {entry.threadItems?.length ? (
                <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600">
                  타래 {entry.threadItems.length + 1}개
                </span>
              ) : null}
              {entry.spoilerRanges?.some((ranges) => ranges.length > 0) ? (
                <span className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-semibold text-white">
                  스포일러{" "}
                  {entry.spoilerRanges.reduce(
                    (total, ranges) => total + ranges.length,
                    0,
                  )}
                  개
                </span>
              ) : null}
              {entry.isImageSpoiler ? (
                <span className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-semibold text-white">
                  이미지 스포일러
                </span>
              ) : null}
            </div>
            <p className="mt-3 line-clamp-4 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800">
              {entry.content}
            </p>
            {entry.threadItems?.length ? (
              <div className="mt-3 space-y-2 border-l border-zinc-200 pl-3">
                {entry.threadItems.map((item, index) => (
                  <p
                    key={`${entry.id}-thread-${index}`}
                    className="line-clamp-3 whitespace-pre-wrap break-words text-xs leading-5 text-zinc-600"
                  >
                    <span className="mr-1 font-semibold text-zinc-500">
                      {index + 2}.
                    </span>
                    {item}
                  </p>
                ))}
              </div>
            ) : null}
            {entry.imageUrl ? (
              <div className="mt-3 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
                <div className="relative h-48 w-full">
                  <Image
                    className={`object-contain ${entry.isImageSpoiler ? "blur-md" : ""}`}
                    src={entry.imageUrl}
                    alt="게시 기록 첨부 이미지"
                    fill
                    sizes="360px"
                    unoptimized
                  />
                  {entry.isImageSpoiler ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 text-xs font-semibold text-white">
                      스포일러 이미지
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            <dl className="mt-3 space-y-1 text-xs text-zinc-600">
              <div className="flex justify-between gap-3">
                <dt>작성</dt>
                <dd className="text-right">{formatDateTime(entry.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>요청</dt>
                <dd className="text-right">
                  {formatDateTime(entry.requestedAt)}
                </dd>
              </div>
            </dl>
            <div className="mt-3 space-y-1.5">
              {entry.results.map((result) => (
                <div
                  key={`${entry.id}-${result.platform}`}
                  className={`rounded-md px-2.5 py-2 text-xs font-medium leading-5 ${
                    result.success
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {PLATFORM_LABEL[result.platform]}:{" "}
                  {result.success ? "성공" : "실패"} - {result.message}
                  {result.postUrl ? (
                    <>
                      {" "}
                      <a
                        className="underline underline-offset-2"
                        href={result.postUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        보기
                      </a>
                    </>
                  ) : null}
                  {!result.success ? (
                    <PublishErrorDetails compact detail={result.errorDetail} />
                  ) : null}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}
