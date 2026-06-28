"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
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
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold">최근 게시 결과</h3>
      <div className="mt-3 space-y-2">
        {results.map((result) => (
          <div
            key={`${result.platform}-${result.postedAt}`}
            className={`rounded-md border px-3 py-2 ${
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
                {result.postUrl ? (
                  <a
                    className="mt-2 inline-flex text-sm font-semibold text-teal-700 underline-offset-2 hover:underline"
                    href={result.postUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    X에서 보기
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
