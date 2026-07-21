"use client";

import {
  CornerDownRight,
  ExternalLink,
  Heart,
  Inbox,
  Loader2,
  MessageCircle,
  RefreshCw,
  Repeat2,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PublishErrorDetails } from "@/components/PublishErrorDetails";
import { createErrorDetailFromUnknown } from "@/lib/publisher/errorDetails";
import {
  THREADS_TEXT_LIMIT,
  THREADS_TEXT_WARNING_THRESHOLD,
  countThreadsTextCharacters,
  validateThreadsText,
} from "@/lib/threadsLimits";
import type {
  PublishErrorDetail,
  ThreadsInsightValues,
  ThreadsInsightsSummary,
  ThreadsMediaSummary,
  ThreadsReply,
  ThreadsReplyPublishResult,
} from "@/lib/types";

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

function shortId(value: string) {
  return value.length > 10 ? `${value.slice(0, 10)}...` : value;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function getPreviewText(value?: string) {
  const text = value?.trim();

  return text || "텍스트 없는 게시물";
}

type PostInsightPreview = Pick<ThreadsInsightValues, "likes" | "replies" | "reposts">;

function ReplyPublishFeedback({
  result,
  compact = false,
}: {
  result: ThreadsReplyPublishResult;
  compact?: boolean;
}) {
  return (
    <div
      className={`${compact ? "mt-3 px-3 py-2" : "mt-3 px-3 py-2.5"} rounded-md border text-sm font-medium ${
        result.success
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      <p>
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
      </p>
      {!result.success && result.errorDetail ? (
        <PublishErrorDetails compact detail={result.errorDetail} />
      ) : null}
    </div>
  );
}

export function ThreadsInbox({ refreshToken = 0 }: { refreshToken?: number }) {
  const [posts, setPosts] = useState<ThreadsMediaSummary[]>([]);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [replies, setReplies] = useState<ThreadsReply[]>([]);
  const [postInsightMap, setPostInsightMap] = useState<Record<string, PostInsightPreview>>({});
  const [isLoadingPostInsights, setIsLoadingPostInsights] = useState(false);
  const [postInsightError, setPostInsightError] = useState("");
  const [postInsightErrorDetail, setPostInsightErrorDetail] =
    useState<PublishErrorDetail | null>(null);
  const [rootReplyContent, setRootReplyContent] = useState("");
  const [activeReplyId, setActiveReplyId] = useState("");
  const [inlineReplyContent, setInlineReplyContent] = useState("");
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [submittingReplyTargetId, setSubmittingReplyTargetId] = useState("");
  const [postError, setPostError] = useState("");
  const [postErrorDetail, setPostErrorDetail] =
    useState<PublishErrorDetail | null>(null);
  const [replyError, setReplyError] = useState("");
  const [replyErrorDetail, setReplyErrorDetail] =
    useState<PublishErrorDetail | null>(null);
  const [rootReplyError, setRootReplyError] = useState("");
  const [inlineReplyError, setInlineReplyError] = useState("");
  const [rootReplyResult, setRootReplyResult] =
    useState<ThreadsReplyPublishResult | null>(null);
  const [inlineReplyResult, setInlineReplyResult] =
    useState<ThreadsReplyPublishResult | null>(null);

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) ?? null,
    [posts, selectedPostId],
  );
  const rootReplyCharacterCount = countThreadsTextCharacters(rootReplyContent);
  const inlineReplyCharacterCount = countThreadsTextCharacters(inlineReplyContent);

  const loadPostInsights = useCallback(async (limit: number) => {
    setIsLoadingPostInsights(true);
    setPostInsightError("");
    setPostInsightErrorDetail(null);

    try {
      const response = await fetch(`/api/threads/insights?limit=${limit}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as ThreadsInsightsSummary & {
        errorDetail?: PublishErrorDetail;
        message?: string;
      };

      if (!response.ok) {
        setPostInsightMap({});
        setPostInsightError(
          data.message ?? "Threads 게시 성과를 불러오지 못했습니다.",
        );
        setPostInsightErrorDetail(data.errorDetail ?? null);
        return;
      }

      const nextInsightMap: Record<string, PostInsightPreview> = {};

      for (const insight of data.posts ?? []) {
        nextInsightMap[insight.post.id] = {
          likes: insight.metrics.likes,
          replies: insight.metrics.replies,
          reposts: insight.metrics.reposts,
        };
      }

      setPostInsightMap(nextInsightMap);
    } catch (insightError) {
      setPostInsightMap({});
      setPostInsightError("Threads 게시 성과 요청 중 문제가 발생했습니다.");
      setPostInsightErrorDetail(
        createErrorDetailFromUnknown(insightError, {
          source: "SNS auto upload",
          stage: "network",
          stageLabel: "게시 성과 요청",
          itemLabel: "인사이트",
        }),
      );
    } finally {
      setIsLoadingPostInsights(false);
    }
  }, []);

  const loadPosts = useCallback(async () => {
    setIsLoadingPosts(true);
    setPostError("");
    setPostErrorDetail(null);

    try {
      const response = await fetch("/api/threads/posts?limit=15", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        errorDetail?: PublishErrorDetail;
        message?: string;
        posts?: ThreadsMediaSummary[];
      };

      if (!response.ok) {
        setPostError(data.message ?? "Threads 게시물을 불러오지 못했습니다.");
        setPostErrorDetail(data.errorDetail ?? null);
        setPosts([]);
        setSelectedPostId("");
        setPostInsightMap({});
        setReplies([]);
        return;
      }

      const nextPosts = data.posts ?? [];
      setPosts(nextPosts);
      void loadPostInsights(Math.max(nextPosts.length, 1));
      if (nextPosts.length === 0) {
        setReplies([]);
        setPostInsightMap({});
      }

      setSelectedPostId((currentSelectedPostId) => {
        const currentPostExists = nextPosts.some(
          (post) => post.id === currentSelectedPostId,
        );
        const nextSelectedPostId = currentPostExists
          ? currentSelectedPostId
          : nextPosts[0]?.id ?? "";

        return nextSelectedPostId;
      });
    } catch (postsError) {
      setPostError("Threads 게시물 요청 중 문제가 발생했습니다.");
      setPostErrorDetail(
        createErrorDetailFromUnknown(postsError, {
          source: "SNS auto upload",
          stage: "network",
          stageLabel: "내 게시물 요청",
          itemLabel: "게시물 목록",
        }),
      );
      setPosts([]);
      setSelectedPostId("");
      setPostInsightMap({});
      setReplies([]);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [loadPostInsights]);

  const loadReplies = useCallback(async (postId = selectedPostId) => {
    if (!postId) {
      return;
    }

    setIsLoadingReplies(true);
    setReplyError("");
    setReplyErrorDetail(null);

    try {
      const response = await fetch(
        `/api/threads/posts/${encodeURIComponent(postId)}/replies?limit=50`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        errorDetail?: PublishErrorDetail;
        message?: string;
        replies?: ThreadsReply[];
      };

      if (!response.ok) {
        setReplyError(data.message ?? "Threads 댓글을 불러오지 못했습니다.");
        setReplyErrorDetail(data.errorDetail ?? null);
        setReplies([]);
        return;
      }

      setReplies(data.replies ?? []);
    } catch (repliesError) {
      setReplyError("Threads 댓글 요청 중 문제가 발생했습니다.");
      setReplyErrorDetail(
        createErrorDetailFromUnknown(repliesError, {
          source: "SNS auto upload",
          stage: "network",
          stageLabel: "댓글 요청",
          itemLabel: "댓글 목록",
        }),
      );
      setReplies([]);
    } finally {
      setIsLoadingReplies(false);
    }
  }, [selectedPostId]);

  function selectPost(post: ThreadsMediaSummary) {
    setSelectedPostId(post.id);
    setRootReplyContent("");
    setActiveReplyId("");
    setInlineReplyContent("");
    setRootReplyResult(null);
    setInlineReplyResult(null);
    setRootReplyError("");
    setInlineReplyError("");
    setReplyError("");
    setReplyErrorDetail(null);
  }

  async function submitReply({
    content,
    onSuccess,
    replyToId,
    setError,
    setResult,
  }: {
    content: string;
    onSuccess: () => void;
    replyToId: string;
    setError: (message: string) => void;
    setResult: (result: ThreadsReplyPublishResult | null) => void;
  }) {
    const trimmedContent = content.trim();

    setError("");
    setResult(null);

    if (!replyToId) {
      setError("답글을 달 게시물 또는 댓글을 선택해 주세요.");
      return;
    }

    if (!trimmedContent) {
      setError("답글 내용을 입력해 주세요.");
      return;
    }

    const contentValidation = validateThreadsText(trimmedContent);

    if (!contentValidation.ok) {
      setError(`답글은 ${THREADS_TEXT_LIMIT}자를 초과할 수 없습니다.`);
      return;
    }

    setSubmittingReplyTargetId(replyToId);

    try {
      const response = await fetch("/api/threads/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replyToId,
          content: trimmedContent,
        }),
      });
      const data = (await response.json()) as {
        errorDetail?: PublishErrorDetail;
        message?: string;
        result?: ThreadsReplyPublishResult;
      };
      const result = data.result;

      if (!response.ok || !result?.success) {
        setResult(
          result ?? {
            success: false,
            message: data.message ?? "Threads 답글 게시에 실패했습니다.",
            postedAt: new Date().toISOString(),
            errorDetail:
              data.errorDetail ??
              createErrorDetailFromUnknown(
                data.message ?? "Threads 답글 게시에 실패했습니다.",
                {
                  source: "SNS auto upload",
                  stage: "reply-validation",
                  stageLabel: "답글 요청 확인",
                  itemLabel: "답글",
                  httpStatus: response.status,
                },
              ),
          },
        );
        return;
      }

      setResult(result);
      onSuccess();
      await loadReplies();
    } catch (replySubmitError) {
      setResult({
        success: false,
        message: "Threads 답글 게시 중 문제가 발생했습니다.",
        postedAt: new Date().toISOString(),
        errorDetail: createErrorDetailFromUnknown(replySubmitError, {
          source: "SNS auto upload",
          stage: "network",
          stageLabel: "답글 요청 전송",
          itemLabel: "답글",
        }),
      });
    } finally {
      setSubmittingReplyTargetId("");
    }
  }

  async function handleRootReplySubmit() {
    if (!selectedPost) {
      setRootReplyError("답글을 달 원글을 먼저 선택해 주세요.");
      return;
    }

    await submitReply({
      content: rootReplyContent,
      onSuccess: () => setRootReplyContent(""),
      replyToId: selectedPost.id,
      setError: setRootReplyError,
      setResult: setRootReplyResult,
    });
  }

  async function handleInlineReplySubmit(reply: ThreadsReply) {
    await submitReply({
      content: inlineReplyContent,
      onSuccess: () => {
        setInlineReplyContent("");
      },
      replyToId: reply.id,
      setError: setInlineReplyError,
      setResult: setInlineReplyResult,
    });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPosts();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadPosts, refreshToken]);

  useEffect(() => {
    if (!selectedPostId) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadReplies(selectedPostId);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadReplies, selectedPostId]);

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-700">
            <Inbox aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Threads inbox
            </p>
            <h2 className="text-lg font-semibold text-zinc-950">댓글함</h2>
          </div>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:bg-zinc-100 disabled:text-zinc-400"
          type="button"
          onClick={loadPosts}
          disabled={isLoadingPosts}
          title="Threads 게시물 새로고침"
        >
          <RefreshCw
            aria-hidden="true"
            className={`h-4 w-4 ${isLoadingPosts ? "animate-spin" : ""}`}
          />
          새로고침
        </button>
      </div>

      <div className="grid min-h-[560px] lg:grid-cols-[minmax(260px,0.42fr)_minmax(0,1fr)]">
        <div className="border-b border-zinc-200 bg-zinc-50 p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-900">내 게시물</p>
            <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-zinc-600">
              {posts.length.toLocaleString("ko-KR")}개
            </span>
          </div>

          {postError ? (
            postErrorDetail ? (
              <PublishErrorDetails compact detail={postErrorDetail} />
            ) : (
              <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
                {postError}
              </p>
            )
          ) : null}
          {postInsightError && !postError ? (
            postInsightErrorDetail ? (
              <PublishErrorDetails compact detail={postInsightErrorDetail} />
            ) : (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                인사이트 표시 실패: {postInsightError}
              </p>
            )
          ) : null}

          <div className="mt-3 space-y-2">
            {posts.length === 0 && isLoadingPosts ? (
              <div className="space-y-2">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-24 animate-pulse rounded-md border border-zinc-200 bg-white"
                  />
                ))}
              </div>
            ) : null}

            {posts.length === 0 && !isLoadingPosts && !postError ? (
              <div className="rounded-md border border-dashed border-zinc-300 bg-white px-3 py-10 text-center">
                <p className="text-sm font-medium text-zinc-500">
                  불러올 게시물이 없습니다.
                </p>
              </div>
            ) : null}

            {posts.map((post) => {
              const isSelected = post.id === selectedPostId;
              const insight = postInsightMap[post.id];

              return (
                <button
                  key={post.id}
                  className={`w-full rounded-md border px-3 py-3 text-left shadow-sm transition ${
                    isSelected
                      ? "border-teal-700 bg-white ring-1 ring-teal-700"
                      : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                  type="button"
                  onClick={() => selectPost(post)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-teal-700">
                      @{post.username ?? "threads"}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {formatDateTime(post.timestamp)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-800">
                    {getPreviewText(post.text)}
                  </p>
                  <p className="mt-2 text-xs font-medium text-zinc-500">
                    ID {shortId(post.id)}
                    {post.mediaType ? ` · ${post.mediaType}` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-zinc-500">
                    <span
                      className="inline-flex items-center gap-1"
                      title="좋아요"
                    >
                      <Heart aria-hidden="true" className="h-3.5 w-3.5" />
                      {insight
                        ? formatNumber(insight.likes)
                        : isLoadingPostInsights
                          ? "-"
                          : "0"}
                    </span>
                    <span
                      className="inline-flex items-center gap-1"
                      title="댓글"
                    >
                      <MessageCircle
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                      />
                      {insight
                        ? formatNumber(insight.replies)
                        : isLoadingPostInsights
                          ? "-"
                          : "0"}
                    </span>
                    <span
                      className="inline-flex items-center gap-1"
                      title="리포스트"
                    >
                      <Repeat2 aria-hidden="true" className="h-3.5 w-3.5" />
                      {insight
                        ? formatNumber(insight.reposts)
                        : isLoadingPostInsights
                          ? "-"
                          : "0"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {selectedPost ? (
            <div className="space-y-4">
              <article className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      Selected post
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-950">
                      @{selectedPost.username ?? "threads"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedPost.permalink ? (
                      <a
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50"
                        href={selectedPost.permalink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink aria-hidden="true" className="h-4 w-4" />
                        보기
                      </a>
                    ) : null}
                    <button
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:text-zinc-400"
                      type="button"
                      onClick={() => loadReplies()}
                      disabled={isLoadingReplies}
                      title="댓글 새로고침"
                    >
                      <RefreshCw
                        aria-hidden="true"
                        className={`h-4 w-4 ${
                          isLoadingReplies ? "animate-spin" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800">
                  {getPreviewText(selectedPost.text)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-zinc-500">
                  <span>{formatDateTime(selectedPost.timestamp)}</span>
                  <span>ID {shortId(selectedPost.id)}</span>
                  {selectedPost.mediaType ? <span>{selectedPost.mediaType}</span> : null}
                </div>
              </article>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-teal-700">
                      <MessageCircle aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        원글에 답글
                      </p>
                      <p className="text-xs text-zinc-500">
                        선택한 원글에 바로 답글을 남깁니다.
                      </p>
                    </div>
                  </div>
                </div>

                <label className="mt-3 block">
                  <span className="sr-only">답글 내용</span>
                  <textarea
                    className="min-h-28 w-full resize-y rounded-md border border-zinc-300 bg-white p-3 text-sm leading-6 text-zinc-950 shadow-sm transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-teal-700"
                    value={rootReplyContent}
                    onChange={(event) => setRootReplyContent(event.target.value)}
                    placeholder="선택한 원글에 남길 답글을 작성하세요."
                    disabled={submittingReplyTargetId === selectedPost.id}
                  />
                </label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p
                    className={`text-xs font-semibold ${
                      rootReplyCharacterCount > THREADS_TEXT_LIMIT
                        ? "text-rose-600"
                        : rootReplyCharacterCount >=
                            THREADS_TEXT_WARNING_THRESHOLD
                          ? "text-amber-600"
                          : "text-zinc-500"
                    }`}
                  >
                    {rootReplyCharacterCount.toLocaleString("ko-KR")} / {THREADS_TEXT_LIMIT}자
                  </p>
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:bg-zinc-400"
                    type="button"
                    onClick={handleRootReplySubmit}
                    disabled={
                      submittingReplyTargetId === selectedPost.id ||
                      rootReplyCharacterCount > THREADS_TEXT_LIMIT
                    }
                  >
                    {submittingReplyTargetId === selectedPost.id ? (
                      <Loader2
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin"
                      />
                    ) : (
                      <Send aria-hidden="true" className="h-4 w-4" />
                    )}
                    {submittingReplyTargetId === selectedPost.id
                      ? "답글 게시 중"
                      : "원글에 답글 게시"}
                  </button>
                </div>

                {rootReplyError ? (
                  <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
                    {rootReplyError}
                  </p>
                ) : null}

                {rootReplyResult ? (
                  <ReplyPublishFeedback result={rootReplyResult} />
                ) : null}
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-900">
                    불러온 댓글
                  </p>
                  <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600">
                    {replies.length.toLocaleString("ko-KR")}개
                  </span>
                </div>

                {replyError ? (
                  replyErrorDetail ? (
                    <PublishErrorDetails compact detail={replyErrorDetail} />
                  ) : (
                    <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
                      {replyError}
                    </p>
                  )
                ) : null}

                {replyError ? null : (
                  <div className="mt-3 space-y-2">
                    {replies.length === 0 && isLoadingReplies ? (
                      <div className="space-y-2">
                        {[0, 1].map((item) => (
                          <div
                            key={item}
                            className="h-24 animate-pulse rounded-md border border-zinc-200 bg-white"
                          />
                        ))}
                      </div>
                    ) : null}

                    {replies.length === 0 && !isLoadingReplies ? (
                      <div className="rounded-md border border-dashed border-zinc-300 bg-white px-3 py-10 text-center">
                        <p className="text-sm font-medium text-zinc-500">
                          아직 불러온 댓글이 없습니다.
                        </p>
                      </div>
                    ) : null}

                    {replies.map((reply) => {
                      const isInlineReplyOpen = activeReplyId === reply.id;
                      const isSubmittingThisReply =
                        submittingReplyTargetId === reply.id;

                      return (
                        <article
                          key={reply.id}
                          className="rounded-md border border-zinc-200 bg-white p-3"
                        >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-zinc-950">
                              @{reply.username ?? "threads"}
                            </p>
                            <p className="text-xs font-medium text-zinc-500">
                              {formatDateTime(reply.timestamp)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {reply.permalink ? (
                              <a
                                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
                                href={reply.permalink}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5"
                                />
                                보기
                              </a>
                            ) : null}
                            <button
                              className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold shadow-sm transition ${
                                isInlineReplyOpen
                                  ? "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-50"
                                  : "border-teal-700 bg-white text-teal-800 hover:bg-teal-50"
                              }`}
                              type="button"
                              onClick={() => {
                                setInlineReplyError("");
                                setInlineReplyResult(null);
                                setInlineReplyContent("");
                                setActiveReplyId((currentReplyId) =>
                                  currentReplyId === reply.id ? "" : reply.id,
                                );
                              }}
                            >
                              <CornerDownRight
                                aria-hidden="true"
                                className="h-3.5 w-3.5"
                              />
                              {isInlineReplyOpen ? "답글 닫기" : "이 댓글에 답글"}
                            </button>
                          </div>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800">
                          {getPreviewText(reply.text)}
                        </p>
                        <p className="mt-2 text-xs font-medium text-zinc-500">
                          ID {shortId(reply.id)}
                          {reply.mediaType ? ` · ${reply.mediaType}` : ""}
                        </p>
                        {isInlineReplyOpen ? (
                          <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                            <label className="block">
                              <span className="sr-only">
                                이 댓글에 남길 답글
                              </span>
                              <textarea
                                className="min-h-24 w-full resize-y rounded-md border border-zinc-300 bg-white p-3 text-sm leading-6 text-zinc-950 shadow-sm transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-teal-700"
                                value={inlineReplyContent}
                                onChange={(event) =>
                                  setInlineReplyContent(event.target.value)
                                }
                                placeholder={`@${reply.username ?? "threads"} 댓글에 답글을 작성하세요.`}
                                disabled={isSubmittingThisReply}
                              />
                            </label>
                            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <p
                                className={`text-xs font-semibold ${
                                  inlineReplyCharacterCount > THREADS_TEXT_LIMIT
                                    ? "text-rose-600"
                                    : inlineReplyCharacterCount >=
                                        THREADS_TEXT_WARNING_THRESHOLD
                                      ? "text-amber-600"
                                      : "text-zinc-500"
                                }`}
                              >
                                {inlineReplyCharacterCount.toLocaleString(
                                  "ko-KR",
                                )} / {THREADS_TEXT_LIMIT}자
                              </p>
                              <button
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:bg-zinc-400"
                                type="button"
                                onClick={() => handleInlineReplySubmit(reply)}
                                disabled={
                                  isSubmittingThisReply ||
                                  inlineReplyCharacterCount > THREADS_TEXT_LIMIT
                                }
                              >
                                {isSubmittingThisReply ? (
                                  <Loader2
                                    aria-hidden="true"
                                    className="h-4 w-4 animate-spin"
                                  />
                                ) : (
                                  <Send aria-hidden="true" className="h-4 w-4" />
                                )}
                                {isSubmittingThisReply
                                  ? "답글 게시 중"
                                  : "이 댓글에 답글 게시"}
                              </button>
                            </div>

                            {inlineReplyError ? (
                              <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                                {inlineReplyError}
                              </p>
                            ) : null}

                            {inlineReplyResult ? (
                              <ReplyPublishFeedback
                                compact
                                result={inlineReplyResult}
                              />
                            ) : null}
                          </div>
                        ) : null}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 text-center">
              <div>
                <p className="text-sm font-semibold text-zinc-700">
                  게시물을 먼저 불러와 주세요.
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Threads 연결 권한이 맞으면 최근 게시물이 이곳에 표시됩니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
