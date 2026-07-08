"use client";

import {
  CornerDownRight,
  ExternalLink,
  Inbox,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
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

function getPreviewText(value?: string) {
  const text = value?.trim();

  return text || "텍스트 없는 게시물";
}

type ReplyTarget = {
  id: string;
  label: string;
};

export function ThreadsInbox({ refreshToken }: { refreshToken: number }) {
  const [posts, setPosts] = useState<ThreadsMediaSummary[]>([]);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [replies, setReplies] = useState<ThreadsReply[]>([]);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [postError, setPostError] = useState("");
  const [replyError, setReplyError] = useState("");
  const [replyResult, setReplyResult] =
    useState<ThreadsReplyPublishResult | null>(null);

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) ?? null,
    [posts, selectedPostId],
  );

  const loadPosts = useCallback(async () => {
    setIsLoadingPosts(true);
    setPostError("");

    try {
      const response = await fetch("/api/threads/posts?limit=15", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        message?: string;
        posts?: ThreadsMediaSummary[];
      };

      if (!response.ok) {
        setPostError(data.message ?? "Threads 게시물을 불러오지 못했습니다.");
        setPosts([]);
        setSelectedPostId("");
        setReplyTarget(null);
        setReplies([]);
        return;
      }

      const nextPosts = data.posts ?? [];
      setPosts(nextPosts);
      if (nextPosts.length === 0) {
        setReplies([]);
      }

      setSelectedPostId((currentSelectedPostId) => {
        const currentPostExists = nextPosts.some(
          (post) => post.id === currentSelectedPostId,
        );
        const nextSelectedPostId = currentPostExists
          ? currentSelectedPostId
          : nextPosts[0]?.id ?? "";

        const nextSelectedPost = nextPosts.find(
          (post) => post.id === nextSelectedPostId,
        );

        setReplyTarget(
          nextSelectedPost
            ? { id: nextSelectedPost.id, label: "선택한 원글" }
            : null,
        );

        return nextSelectedPostId;
      });
    } catch {
      setPostError("Threads 게시물 요청 중 문제가 발생했습니다.");
      setPosts([]);
      setSelectedPostId("");
      setReplyTarget(null);
      setReplies([]);
    } finally {
      setIsLoadingPosts(false);
    }
  }, []);

  const loadReplies = useCallback(async (postId = selectedPostId) => {
    if (!postId) {
      return;
    }

    setIsLoadingReplies(true);
    setReplyError("");

    try {
      const response = await fetch(
        `/api/threads/posts/${encodeURIComponent(postId)}/replies?limit=50`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        message?: string;
        replies?: ThreadsReply[];
      };

      if (!response.ok) {
        setReplyError(data.message ?? "Threads 댓글을 불러오지 못했습니다.");
        setReplies([]);
        return;
      }

      setReplies(data.replies ?? []);
    } catch {
      setReplyError("Threads 댓글 요청 중 문제가 발생했습니다.");
      setReplies([]);
    } finally {
      setIsLoadingReplies(false);
    }
  }, [selectedPostId]);

  function selectPost(post: ThreadsMediaSummary) {
    setSelectedPostId(post.id);
    setReplyTarget({ id: post.id, label: "선택한 원글" });
    setReplyContent("");
    setReplyResult(null);
    setReplyError("");
  }

  async function handleReplySubmit() {
    const content = replyContent.trim();

    setReplyError("");
    setReplyResult(null);

    if (!replyTarget) {
      setReplyError("답글을 달 게시물 또는 댓글을 선택해 주세요.");
      return;
    }

    if (!content) {
      setReplyError("답글 내용을 입력해 주세요.");
      return;
    }

    setIsSubmittingReply(true);

    try {
      const response = await fetch("/api/threads/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replyToId: replyTarget.id,
          content,
        }),
      });
      const data = (await response.json()) as {
        result?: ThreadsReplyPublishResult;
      };
      const result = data.result;

      if (!response.ok || !result?.success) {
        setReplyResult(
          result ?? {
            success: false,
            message: "Threads 답글 게시에 실패했습니다.",
            postedAt: new Date().toISOString(),
          },
        );
        return;
      }

      setReplyResult(result);
      setReplyContent("");
      await loadReplies();
    } catch {
      setReplyResult({
        success: false,
        message: "Threads 답글 게시 중 문제가 발생했습니다.",
        postedAt: new Date().toISOString(),
      });
    } finally {
      setIsSubmittingReply(false);
    }
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
            <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
              {postError}
            </p>
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
                        대화 및 답글
                      </p>
                      <p className="text-xs text-zinc-500">
                        답글 대상: {replyTarget?.label ?? "선택 없음"}
                      </p>
                    </div>
                  </div>
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-teal-700 bg-white px-3 text-sm font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50"
                    type="button"
                    onClick={() =>
                      setReplyTarget({
                        id: selectedPost.id,
                        label: "선택한 원글",
                      })
                    }
                  >
                    <CornerDownRight aria-hidden="true" className="h-4 w-4" />
                    원글에 답글
                  </button>
                </div>

                <label className="mt-3 block">
                  <span className="sr-only">답글 내용</span>
                  <textarea
                    className="min-h-28 w-full resize-y rounded-md border border-zinc-300 bg-white p-3 text-sm leading-6 text-zinc-950 shadow-sm transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-teal-700"
                    value={replyContent}
                    onChange={(event) => setReplyContent(event.target.value)}
                    placeholder="선택한 원글 또는 댓글에 남길 답글을 작성하세요."
                    disabled={isSubmittingReply}
                  />
                </label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-medium text-zinc-500">
                    {replyContent.length.toLocaleString("ko-KR")}자
                  </p>
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:bg-zinc-400"
                    type="button"
                    onClick={handleReplySubmit}
                    disabled={isSubmittingReply}
                  >
                    {isSubmittingReply ? (
                      <Loader2
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin"
                      />
                    ) : (
                      <Send aria-hidden="true" className="h-4 w-4" />
                    )}
                    {isSubmittingReply ? "답글 게시 중" : "답글 게시"}
                  </button>
                </div>

                {replyError ? (
                  <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
                    {replyError}
                  </p>
                ) : null}

                {replyResult ? (
                  <p
                    className={`mt-3 rounded-md border px-3 py-2.5 text-sm font-medium ${
                      replyResult.success
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                  >
                    {replyResult.success ? "성공" : "실패"} -{" "}
                    {replyResult.message}
                    {replyResult.postUrl ? (
                      <>
                        {" "}
                        <a
                          className="underline underline-offset-2"
                          href={replyResult.postUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          보기
                        </a>
                      </>
                    ) : null}
                  </p>
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

                    {replies.map((reply) => (
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
                              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-teal-700 bg-white px-2.5 text-xs font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50"
                              type="button"
                              onClick={() =>
                                setReplyTarget({
                                  id: reply.id,
                                  label: `@${reply.username ?? "threads"} 댓글`,
                                })
                              }
                            >
                              <CornerDownRight
                                aria-hidden="true"
                                className="h-3.5 w-3.5"
                              />
                              이 댓글에 답글
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
                      </article>
                    ))}
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
