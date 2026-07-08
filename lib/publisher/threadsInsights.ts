import {
  THREADS_GRAPH_BASE_URL,
  createThreadsErrorMessage,
  getThreadsCredentials,
  getThreadsJson,
} from "@/lib/publisher/threadsApi";
import { getThreadsPosts } from "@/lib/publisher/threadsInbox";
import type {
  ThreadsInsightMetric,
  ThreadsInsightValues,
  ThreadsInsightsSummary,
  ThreadsPostInsight,
} from "@/lib/types";

export const THREADS_INSIGHT_METRICS: ThreadsInsightMetric[] = [
  "views",
  "likes",
  "replies",
  "reposts",
  "quotes",
  "shares",
];

const EMPTY_METRICS: ThreadsInsightValues = {
  views: 0,
  likes: 0,
  replies: 0,
  reposts: 0,
  quotes: 0,
  shares: 0,
};

type ThreadsInsightApiItem = {
  name?: string;
  period?: string;
  values?: Array<{
    value?: unknown;
    end_time?: string;
  }>;
  title?: string;
  description?: string;
};

type ThreadsInsightApiResponse = {
  data?: ThreadsInsightApiItem[];
};

function cloneEmptyMetrics(): ThreadsInsightValues {
  return { ...EMPTY_METRICS };
}

function normalizeLimit(value: number | undefined, fallback: number, max: number) {
  if (!value || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.floor(value), 1), max);
}

function getNumericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function isThreadsInsightMetric(value: string): value is ThreadsInsightMetric {
  return THREADS_INSIGHT_METRICS.includes(value as ThreadsInsightMetric);
}

function normalizeInsights(data: ThreadsInsightApiItem[] | undefined) {
  const metrics = cloneEmptyMetrics();

  for (const item of data ?? []) {
    const name = item.name?.trim();

    if (!name || !isThreadsInsightMetric(name)) {
      continue;
    }

    metrics[name] = getNumericValue(item.values?.[0]?.value);
  }

  return metrics;
}

function getEngagement(metrics: ThreadsInsightValues) {
  return (
    metrics.likes +
    metrics.replies +
    metrics.reposts +
    metrics.quotes +
    metrics.shares
  );
}

function getEngagementRate(metrics: ThreadsInsightValues) {
  if (metrics.views <= 0) {
    return 0;
  }

  return Number(((getEngagement(metrics) / metrics.views) * 100).toFixed(2));
}

async function getMediaInsights(mediaId: string) {
  const { accessToken } = getThreadsCredentials();
  const response = await getThreadsJson<ThreadsInsightApiResponse>(
    `${THREADS_GRAPH_BASE_URL}/${encodeURIComponent(mediaId)}/insights`,
    {
      metric: THREADS_INSIGHT_METRICS.join(","),
      access_token: accessToken,
    },
  );

  if (!response.ok) {
    throw new Error(createThreadsErrorMessage(response.status, response.body));
  }

  if (typeof response.body === "string") {
    return cloneEmptyMetrics();
  }

  return normalizeInsights(response.body.data);
}

export async function getThreadsPostInsights(
  options: { limit?: number } = {},
): Promise<ThreadsInsightsSummary> {
  const posts = await getThreadsPosts({
    limit: normalizeLimit(options.limit, 20, 50),
  });
  const insights = await Promise.all(
    posts.map(async (post): Promise<ThreadsPostInsight> => {
      try {
        const metrics = await getMediaInsights(post.id);
        const engagement = getEngagement(metrics);

        return {
          post,
          metrics,
          engagement,
          engagementRate: getEngagementRate(metrics),
        };
      } catch (error) {
        const metrics = cloneEmptyMetrics();

        return {
          post,
          metrics,
          engagement: 0,
          engagementRate: 0,
          errorMessage:
            error instanceof Error
              ? error.message
              : "Threads 인사이트를 불러오지 못했습니다.",
        };
      }
    }),
  );
  const totals = insights.reduce(
    (accumulator, insight) => {
      for (const metric of THREADS_INSIGHT_METRICS) {
        accumulator[metric] += insight.metrics[metric];
      }

      accumulator.engagement += insight.engagement;

      return accumulator;
    },
    {
      ...cloneEmptyMetrics(),
      engagement: 0,
      engagementRate: 0,
    },
  );

  totals.engagementRate =
    totals.views > 0
      ? Number(((totals.engagement / totals.views) * 100).toFixed(2))
      : 0;

  return {
    posts: insights,
    totals,
    checkedAt: new Date().toISOString(),
  };
}
