"use client";

import {
  ArrowDownWideNarrow,
  ExternalLink,
  Eye,
  Heart,
  MessageCircle,
  Quote,
  RefreshCw,
  Repeat2,
  Share2,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PublishErrorDetails } from "@/components/PublishErrorDetails";
import { createErrorDetailFromUnknown } from "@/lib/publisher/errorDetails";
import type {
  PublishErrorDetail,
  ThreadsInsightMetric,
  ThreadsInsightsSummary,
  ThreadsPostInsight,
} from "@/lib/types";

type SortKey = "views" | "engagement" | "engagementRate" | "recent";

const METRIC_LABELS: Record<ThreadsInsightMetric, string> = {
  views: "조회",
  likes: "좋아요",
  replies: "댓글",
  reposts: "리포스트",
  quotes: "인용",
  shares: "공유",
};

const METRIC_ICONS = {
  views: Eye,
  likes: Heart,
  replies: MessageCircle,
  reposts: Repeat2,
  quotes: Quote,
  shares: Share2,
};

const SORT_LABELS: Record<SortKey, string> = {
  views: "조회순",
  engagement: "반응순",
  engagementRate: "반응률순",
  recent: "최신순",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatPercent(value: number) {
  return `${value.toLocaleString("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

function formatDateTime(value?: string) {
  if (!value) {
    return "시간 정보 없음";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "시간 정보 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getPreviewText(value?: string) {
  const text = value?.trim();

  return text || "텍스트 없는 게시물";
}

function sortInsights(posts: ThreadsPostInsight[], sortKey: SortKey) {
  return [...posts].sort((left, right) => {
    if (sortKey === "recent") {
      return (
        new Date(right.post.timestamp ?? 0).getTime() -
        new Date(left.post.timestamp ?? 0).getTime()
      );
    }

    if (sortKey === "engagement") {
      return right.engagement - left.engagement;
    }

    if (sortKey === "engagementRate") {
      return right.engagementRate - left.engagementRate;
    }

    return right.metrics.views - left.metrics.views;
  });
}

export function ThreadsInsightsPanel() {
  const [summary, setSummary] = useState<ThreadsInsightsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorDetail, setErrorDetail] =
    useState<PublishErrorDetail | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("views");

  const sortedPosts = useMemo(
    () => sortInsights(summary?.posts ?? [], sortKey),
    [sortKey, summary?.posts],
  );
  const bestPost = sortedPosts[0] ?? null;

  async function loadInsights() {
    setIsLoading(true);
    setError("");
    setErrorDetail(null);

    try {
      const response = await fetch("/api/threads/insights?limit=20", {
        cache: "no-store",
      });
      const data = (await response.json()) as ThreadsInsightsSummary & {
        errorDetail?: PublishErrorDetail;
        message?: string;
      };

      if (!response.ok) {
        setError(data.message ?? "Threads 게시 성과를 불러오지 못했습니다.");
        setErrorDetail(data.errorDetail ?? null);
        setSummary(null);
        return;
      }

      setSummary(data);
    } catch (insightsError) {
      setError("Threads 게시 성과 요청 중 문제가 발생했습니다.");
      setErrorDetail(
        createErrorDetailFromUnknown(insightsError, {
          source: "SNS auto upload",
          stage: "network",
          stageLabel: "게시 성과 요청",
          itemLabel: "인사이트",
        }),
      );
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInsights();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-700">
            <Trophy aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Insights
            </p>
            <h2 className="text-lg font-semibold text-zinc-950">
              최근 게시 성과
            </h2>
          </div>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:bg-zinc-100 disabled:text-zinc-400"
          type="button"
          onClick={loadInsights}
          disabled={isLoading}
          title="게시 성과 새로고침"
        >
          <RefreshCw
            aria-hidden="true"
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          새로고침
        </button>
      </div>

      {error ? (
        errorDetail ? (
          <PublishErrorDetails detail={errorDetail} />
        ) : (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
            {error}
          </p>
        )
      ) : null}

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Total views
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
              {formatNumber(summary.totals.views)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Engagement
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
              {formatNumber(summary.totals.engagement)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Rate
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
              {formatPercent(summary.totals.engagementRate)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Posts
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
              {formatNumber(summary.posts.length)}
            </p>
          </div>
        </div>
      ) : null}

      {summary ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownWideNarrow
                  aria-hidden="true"
                  className="h-4 w-4 text-teal-700"
                />
                <p className="text-sm font-semibold text-zinc-900">
                  게시물별 성과
                </p>
              </div>
              <select
                className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-400 focus:border-teal-700"
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
              >
                {Object.entries(SORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="divide-y divide-zinc-200">
              {sortedPosts.length === 0 && isLoading ? (
                <div className="space-y-3 p-4">
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="h-32 animate-pulse rounded-md bg-zinc-100"
                    />
                  ))}
                </div>
              ) : null}

              {sortedPosts.length === 0 && !isLoading ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm font-medium text-zinc-500">
                    불러올 게시 성과가 없습니다.
                  </p>
                </div>
              ) : null}

              {sortedPosts.map((insight, index) => (
                <article key={insight.post.id} className="p-4">
                  <div className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm font-semibold text-zinc-950">
                          @{insight.post.username ?? "threads"}
                        </p>
                        <span className="text-xs font-medium text-zinc-500">
                          {formatDateTime(insight.post.timestamp)}
                        </span>
                        {insight.post.permalink ? (
                          <a
                            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 underline-offset-2 hover:underline"
                            href={insight.post.permalink}
                            target="_blank"
                            rel="noreferrer"
                          >
                            보기
                            <ExternalLink
                              aria-hidden="true"
                              className="h-3.5 w-3.5"
                            />
                          </a>
                        ) : null}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800">
                        {getPreviewText(insight.post.text)}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                        {(Object.keys(METRIC_LABELS) as ThreadsInsightMetric[]).map(
                          (metric) => {
                            const Icon = METRIC_ICONS[metric];

                            return (
                              <div
                                key={`${insight.post.id}-${metric}`}
                                className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2"
                              >
                                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                                  <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                                  {METRIC_LABELS[metric]}
                                </div>
                                <p className="mt-1 text-sm font-semibold text-zinc-950">
                                  {formatNumber(insight.metrics[metric])}
                                </p>
                              </div>
                            );
                          },
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-md bg-teal-50 px-2.5 py-1.5 text-teal-700">
                          반응 {formatNumber(insight.engagement)}
                        </span>
                        <span className="rounded-md bg-zinc-100 px-2.5 py-1.5 text-zinc-700">
                          반응률 {formatPercent(insight.engagementRate)}
                        </span>
                      </div>

                      {insight.errorMessage ? (
                        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                          {insight.errorMessage}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-32 xl:self-start">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Best post
              </p>
              {bestPost ? (
                <>
                  <p className="mt-3 line-clamp-5 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800">
                    {getPreviewText(bestPost.post.text)}
                  </p>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                        조회
                      </dt>
                      <dd className="mt-1 font-semibold text-zinc-950">
                        {formatNumber(bestPost.metrics.views)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                        반응
                      </dt>
                      <dd className="mt-1 font-semibold text-zinc-950">
                        {formatNumber(bestPost.engagement)}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="mt-3 text-sm font-medium text-zinc-500">
                  표시할 게시물이 없습니다.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Last checked
              </p>
              <p className="mt-2 text-sm font-semibold text-zinc-900">
                {formatDateTime(summary.checkedAt)}
              </p>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
