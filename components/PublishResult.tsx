"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { PublishErrorDetails } from "@/components/PublishErrorDetails";
import type { PublishResult as PublishResultType } from "@/lib/types";

const PLATFORM_LABEL: Record<PublishResultType["platform"], string> = {
  x: "X",
  threads: "Threads",
};

export function PublishResult({
  results,
}: {
  results: PublishResultType[] | null;
}) {
  if (!results) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-4 py-3 sm:px-5">
        <h3 className="text-base font-semibold text-zinc-950">
          최근 게시 결과
        </h3>
      </div>
      <div className="space-y-2 p-4 sm:p-5">
        {results.map((result) => (
          <div
            key={`${result.platform}-${result.postedAt}`}
            className={`rounded-md border px-3 py-3 ${
              result.success
                ? "border-emerald-200 bg-emerald-50"
                : "border-rose-200 bg-rose-50"
            }`}
          >
            <div className="flex items-start gap-2">
              {result.success ? (
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                />
              ) : (
                <AlertTriangle
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-rose-700"
                />
              )}
              <div>
                <p className="text-sm font-semibold">
                  {PLATFORM_LABEL[result.platform]}:{" "}
                  {result.success ? "성공" : "실패"}
                </p>
                <p className="mt-1 text-sm leading-5 text-zinc-700">
                  {result.message}
                </p>
                {!result.success ? (
                  <PublishErrorDetails detail={result.errorDetail} />
                ) : null}
                {result.threadPostIds && result.threadPostIds.length > 1 ? (
                  <p className="mt-2 text-xs font-semibold text-zinc-600">
                    타래 {result.threadPostIds.length}개 발행됨
                  </p>
                ) : null}
                {result.postUrl ? (
                  <a
                    className="mt-3 inline-flex h-9 items-center rounded-md border border-teal-200 bg-white px-3 text-sm font-semibold text-teal-700 shadow-sm transition hover:bg-teal-50"
                    href={result.postUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {result.platform === "threads" ? "Threads에서 보기" : "X에서 보기"}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
