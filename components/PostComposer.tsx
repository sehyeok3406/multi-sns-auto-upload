"use client";

import {
  MessageSquareText,
  Pencil,
  Plus,
  Save,
  Send,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PlatformSelector } from "@/components/PlatformSelector";
import { PostPreview } from "@/components/PostPreview";
import { PublishResult } from "@/components/PublishResult";
import { Toast } from "@/components/Toast";
import type {
  AuthorPreset,
  Platform,
  PublishResult as PublishResultType,
} from "@/lib/types";

const NO_AUTHOR_PRESET = "none";

export function PostComposer({ onPublished }: { onPublished: () => void }) {
  const [content, setContent] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["x", "threads"]);
  const [createdAt, setCreatedAt] = useState(() => new Date().toISOString());
  const [error, setError] = useState("");
  const [presetError, setPresetError] = useState("");
  const [results, setResults] = useState<PublishResultType[] | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [presets, setPresets] = useState<AuthorPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState(NO_AUTHOR_PRESET);
  const [appliedHeadline, setAppliedHeadline] = useState("");
  const [isLoadingPresets, setIsLoadingPresets] = useState(true);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [isPresetFormOpen, setIsPresetFormOpen] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [presetHeadline, setPresetHeadline] = useState("");
  const trimmedContent = content.trim();
  const characterCount = useMemo(() => content.length, [content]);
  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId) ?? null,
    [presets, selectedPresetId],
  );

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/author-presets", {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          message?: string;
          presets?: AuthorPreset[];
        };

        if (!response.ok) {
          throw new Error(data.message ?? "작성자 프리셋을 불러오지 못했습니다.");
        }

        if (!cancelled) {
          setPresets(data.presets ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setPresetError(
            loadError instanceof Error
              ? loadError.message
              : "작성자 프리셋을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPresets(false);
        }
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  function removeAppliedHeadline(value: string) {
    if (!appliedHeadline) {
      return value;
    }

    if (value === appliedHeadline) {
      return "";
    }

    if (value.startsWith(`${appliedHeadline}\n`)) {
      return value.slice(appliedHeadline.length + 1);
    }

    return value;
  }

  function applyPreset(preset: AuthorPreset | null) {
    const nextHeadline = preset?.headline.trim() ?? "";

    setContent((currentContent) => {
      const body = removeAppliedHeadline(currentContent).replace(/^\n+/, "");

      if (!nextHeadline) {
        return body;
      }

      return body ? `${nextHeadline}\n${body}` : nextHeadline;
    });
    setSelectedPresetId(preset?.id ?? NO_AUTHOR_PRESET);
    setAppliedHeadline(nextHeadline);
    setPresetError("");

    if (!content) {
      setCreatedAt(new Date().toISOString());
    }
  }

  function handlePresetSelect(value: string) {
    if (value === NO_AUTHOR_PRESET) {
      applyPreset(null);
      return;
    }

    const preset = presets.find((item) => item.id === value);
    applyPreset(preset ?? null);
  }

  function closePresetForm() {
    setIsPresetFormOpen(false);
    setEditingPresetId(null);
    setPresetName("");
    setPresetHeadline("");
  }

  function openCreatePresetForm() {
    if (isPresetFormOpen && !editingPresetId) {
      closePresetForm();
      return;
    }

    setEditingPresetId(null);
    setPresetName("");
    setPresetHeadline("");
    setPresetError("");
    setIsPresetFormOpen(true);
  }

  function openEditPresetForm() {
    if (!selectedPreset) {
      setPresetError("수정할 작성자 프리셋을 먼저 선택해 주세요.");
      return;
    }

    setEditingPresetId(selectedPreset.id);
    setPresetName(selectedPreset.name);
    setPresetHeadline(selectedPreset.headline);
    setPresetError("");
    setIsPresetFormOpen(true);
  }

  async function handleSavePreset() {
    const name = presetName.trim();
    const headline = presetHeadline.trim();
    const isEditing = Boolean(editingPresetId);

    setPresetError("");

    if (!name || !headline) {
      setPresetError("이름과 헤드라인을 모두 입력해 주세요.");
      return;
    }

    setIsSavingPreset(true);

    try {
      const response = await fetch("/api/author-presets", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingPresetId, name, headline }),
      });
      const data = (await response.json()) as {
        message?: string;
        preset?: AuthorPreset;
      };

      if (!response.ok || !data.preset) {
        setPresetError(
          data.message ??
            `작성자 프리셋을 ${isEditing ? "수정" : "저장"}하지 못했습니다.`,
        );
        return;
      }

      const savedPreset = data.preset;

      setPresets((currentPresets) => {
        const nextPresets = isEditing
          ? currentPresets.map((preset) =>
              preset.id === savedPreset.id ? savedPreset : preset,
            )
          : [...currentPresets, savedPreset];

        return nextPresets.sort((left, right) =>
          left.name.localeCompare(right.name, "ko"),
        );
      });
      closePresetForm();
      applyPreset(savedPreset);
    } catch {
      setPresetError(
        `작성자 프리셋 ${isEditing ? "수정" : "저장"} 중 문제가 발생했습니다.`,
      );
    } finally {
      setIsSavingPreset(false);
    }
  }

  async function handlePublish() {
    setError("");
    setResults(null);

    if (!trimmedContent) {
      setError("게시글 내용을 입력해 주세요.");
      return;
    }

    if (platforms.length === 0) {
      setError("업로드할 플랫폼을 최소 1개 선택해 주세요.");
      return;
    }

    setIsPublishing(true);

    try {
      const response = await fetch("/api/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmedContent,
          platforms,
          createdAt,
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        results?: PublishResultType[];
      };

      if (!response.ok || !data.results) {
        setError(data.message ?? "게시 요청에 실패했습니다.");
        return;
      }

      setResults(data.results);
      onPublished();

      if (data.results.every((result) => result.success)) {
        setContent("");
        setSelectedPresetId(NO_AUTHOR_PRESET);
        setAppliedHeadline("");
        setCreatedAt(new Date().toISOString());
      }
    } catch {
      setError("게시 요청 중 문제가 발생했습니다.");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-700">
              <MessageSquareText aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Composer
              </p>
              <h2 className="text-lg font-semibold text-zinc-950">
                게시글 작성
              </h2>
            </div>
          </div>
          <span className="inline-flex h-8 w-fit items-center rounded-md bg-zinc-100 px-2.5 text-sm font-semibold text-zinc-700">
            {characterCount.toLocaleString("ko-KR")}자
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <label className="flex-1">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-800">
                  <UserRound aria-hidden="true" className="h-4 w-4 text-zinc-500" />
                  작성자 프리셋
                </span>
                <select
                  className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-950 shadow-sm transition hover:border-zinc-400 focus:border-teal-700"
                  value={selectedPresetId}
                  onChange={(event) => handlePresetSelect(event.target.value)}
                  disabled={isLoadingPresets}
                >
                  <option value={NO_AUTHOR_PRESET}>
                    {isLoadingPresets ? "불러오는 중" : "선택하지 않음"}
                  </option>
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-3 gap-2 sm:flex">
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50"
                  type="button"
                  onClick={() => applyPreset(null)}
                >
                  해제
                </button>
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:bg-zinc-100 disabled:text-zinc-400"
                  type="button"
                  onClick={openEditPresetForm}
                  disabled={!selectedPreset || isLoadingPresets}
                >
                  <Pencil aria-hidden="true" className="h-4 w-4" />
                  편집
                </button>
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-teal-700 bg-white px-3 text-sm font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50"
                  type="button"
                  onClick={openCreatePresetForm}
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  추가
                </button>
              </div>
            </div>

            {selectedPreset ? (
              <p className="mt-3 line-clamp-2 rounded-md bg-white px-3 py-2 text-sm leading-6 text-zinc-600">
                적용 중:{" "}
                <span className="font-medium text-zinc-900">
                  {selectedPreset.headline}
                </span>
              </p>
            ) : null}

          {isPresetFormOpen ? (
            <div className="mt-3 grid gap-3 rounded-md border border-zinc-200 bg-white p-3 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto] md:items-end">
              <p className="text-sm font-semibold text-zinc-800 md:col-span-3">
                {editingPresetId ? "작성자 프리셋 편집" : "작성자 프리셋 추가"}
              </p>
              <label>
                <span className="mb-2 block text-sm font-medium text-zinc-700">
                  이름
                </span>
                <input
                  className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 shadow-sm transition focus:border-teal-700"
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                  placeholder="예: 쉬어"
                  disabled={isSavingPreset}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-zinc-700">
                  헤드라인
                </span>
                <input
                  className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 shadow-sm transition focus:border-teal-700"
                  value={presetHeadline}
                  onChange={(event) => setPresetHeadline(event.target.value)}
                  placeholder="예: [작성자: 쉬어]"
                  disabled={isSavingPreset}
                />
              </label>
              <div className="flex gap-2">
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-900 px-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                  type="button"
                  onClick={handleSavePreset}
                  disabled={isSavingPreset}
                >
                  <Save aria-hidden="true" className="h-4 w-4" />
                  {isSavingPreset
                    ? "저장 중"
                    : editingPresetId
                      ? "수정 저장"
                      : "저장"}
                </button>
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:bg-zinc-100"
                  type="button"
                  onClick={closePresetForm}
                  disabled={isSavingPreset}
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                  취소
                </button>
              </div>
            </div>
          ) : null}

          {presetError ? (
            <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
              {presetError}
            </p>
          ) : null}
          </div>

        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-semibold text-zinc-800">
            게시글 내용
          </span>
          <textarea
            className="min-h-56 w-full resize-y rounded-md border border-zinc-300 bg-white p-4 text-base leading-7 text-zinc-950 shadow-sm transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-teal-700"
            value={content}
            onChange={(event) => {
              if (!content) {
                setCreatedAt(new Date().toISOString());
              }
              setContent(event.target.value);
            }}
            placeholder="팀 계정에 업로드할 게시글을 작성하세요."
          />
        </label>

        <div className="mt-5 space-y-3">
          <p className="text-sm font-semibold text-zinc-800">업로드 대상</p>
          <PlatformSelector selected={platforms} onChange={setPlatforms} />
        </div>

        <div className="mt-5">
          <PostPreview content={content} />
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-zinc-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Toast message={error} />
          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:bg-zinc-400 sm:w-auto"
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            title="게시"
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            {isPublishing ? "게시 중" : "게시"}
          </button>
        </div>
        </div>
      </div>

      <PublishResult results={results} />
    </section>
  );
}
