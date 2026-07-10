"use client";

import {
  EyeOff,
  ImageIcon,
  Loader2,
  MessageSquareText,
  Pencil,
  Plus,
  Save,
  Send,
  Tag,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { PlatformSelector } from "@/components/PlatformSelector";
import { PostPreview } from "@/components/PostPreview";
import { PublishResult } from "@/components/PublishResult";
import { Toast } from "@/components/Toast";
import {
  CUSTOM_TOPIC_TAG,
  NO_TOPIC_TAG,
  TOPIC_TAG_OPTIONS,
  normalizeTopicTag,
  validateTopicTag,
} from "@/lib/topicTags";
import {
  THREADS_TEXT_SPOILER_LIMIT,
  normalizeSpoilerRanges,
  trimTextWithSpoilerRanges,
} from "@/lib/threadsSpoilers";
import {
  THREADS_TEXT_LIMIT,
  THREADS_TEXT_WARNING_THRESHOLD,
  countThreadsTextCharacters,
  validateThreadsText,
} from "@/lib/threadsLimits";
import type {
  AuthorPreset,
  Platform,
  PublishResult as PublishResultType,
  ThreadsSpoilerRange,
} from "@/lib/types";

const NO_AUTHOR_PRESET = "none";
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type CharacterLimitState = "normal" | "warning" | "error";

function getCharacterLimitState(value: string): {
  count: number;
  remaining: number;
  state: CharacterLimitState;
} {
  const count = countThreadsTextCharacters(value);
  const remaining = THREADS_TEXT_LIMIT - count;
  const state =
    count > THREADS_TEXT_LIMIT
      ? "error"
      : count >= THREADS_TEXT_WARNING_THRESHOLD
        ? "warning"
        : "normal";

  return { count, remaining, state };
}

export function PostComposer({ onPublished }: { onPublished: () => void }) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textAreaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const [content, setContent] = useState("");
  const [threadItems, setThreadItems] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>(["threads"]);
  const [createdAt, setCreatedAt] = useState(() => new Date().toISOString());
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");
  const [presetError, setPresetError] = useState("");
  const [results, setResults] = useState<PublishResultType[] | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageName, setImageName] = useState("");
  const [isImageSpoiler, setIsImageSpoiler] = useState(false);
  const [selectedTopicTag, setSelectedTopicTag] = useState(NO_TOPIC_TAG);
  const [customTopicTag, setCustomTopicTag] = useState("");
  const [topicError, setTopicError] = useState("");
  const [spoilerError, setSpoilerError] = useState("");
  const [spoilerRanges, setSpoilerRanges] = useState<ThreadsSpoilerRange[][]>([
    [],
  ]);
  const [presets, setPresets] = useState<AuthorPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState(NO_AUTHOR_PRESET);
  const [appliedHeadline, setAppliedHeadline] = useState("");
  const [isLoadingPresets, setIsLoadingPresets] = useState(true);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [isPresetFormOpen, setIsPresetFormOpen] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [presetHeadline, setPresetHeadline] = useState("");
  const postParts = useMemo(
    () => [content, ...threadItems],
    [content, threadItems],
  );
  const characterInfo = useMemo(
    () => postParts.map((part) => getCharacterLimitState(part)),
    [postParts],
  );
  const mainCharacterInfo = characterInfo[0] ?? getCharacterLimitState("");
  const characterCount = mainCharacterInfo.count;
  const characterLimitState = mainCharacterInfo.state;
  const hasCharacterLimitError = characterInfo.some(
    (info) => info.state === "error",
  );
  const topicTag = useMemo(() => {
    if (selectedTopicTag === NO_TOPIC_TAG) {
      return "";
    }

    if (selectedTopicTag === CUSTOM_TOPIC_TAG) {
      return normalizeTopicTag(customTopicTag);
    }

    return normalizeTopicTag(selectedTopicTag);
  }, [customTopicTag, selectedTopicTag]);
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
    setSpoilerRanges((currentRanges) =>
      currentRanges.map((ranges, index) => (index === 0 ? [] : ranges)),
    );
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

  function clearImage() {
    setImageUrl("");
    setImageName("");
    setImageError("");
    setIsImageSpoiler(false);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  function getPostPartText(partIndex: number) {
    return partIndex === 0 ? content : threadItems[partIndex - 1] ?? "";
  }

  function updateSpoilerRangesForPart(partIndex: number, text: string) {
    setSpoilerRanges((currentRanges) =>
      currentRanges.map((ranges, index) =>
        index === partIndex ? normalizeSpoilerRanges(text, ranges) : ranges,
      ),
    );
  }

  function addSpoilerToSelection(partIndex: number) {
    const textarea = textAreaRefs.current[partIndex];
    const text = getPostPartText(partIndex);

    setSpoilerError("");

    if (!textarea) {
      setSpoilerError("스포일러로 표시할 텍스트를 먼저 선택해 주세요.");
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start === end) {
      setSpoilerError("스포일러로 표시할 텍스트를 드래그해서 선택해 주세요.");
      return;
    }

    const currentRanges = spoilerRanges[partIndex] ?? [];
    const nextRanges = normalizeSpoilerRanges(text, [
      ...currentRanges,
      { start, end },
    ]);

    if (nextRanges.length > THREADS_TEXT_SPOILER_LIMIT) {
      setSpoilerError(
        `한 글에서 스포일러는 최대 ${THREADS_TEXT_SPOILER_LIMIT}개까지 지정할 수 있습니다.`,
      );
      return;
    }

    setSpoilerRanges((currentRangeGroups) =>
      currentRangeGroups.map((ranges, index) =>
        index === partIndex ? nextRanges : ranges,
      ),
    );
  }

  function removeSpoilerRange(partIndex: number, rangeIndex: number) {
    const text = getPostPartText(partIndex);

    setSpoilerRanges((currentRangeGroups) =>
      currentRangeGroups.map((ranges, index) =>
        index === partIndex
          ? normalizeSpoilerRanges(
              text,
              ranges.filter((_, itemIndex) => itemIndex !== rangeIndex),
            )
          : ranges,
      ),
    );
  }

  function renderSpoilerControls(partIndex: number, text: string) {
    const ranges = normalizeSpoilerRanges(text, spoilerRanges[partIndex] ?? []);

    return (
      <div className="mt-2 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50"
            type="button"
            onClick={() => addSpoilerToSelection(partIndex)}
          >
            <EyeOff aria-hidden="true" className="h-4 w-4" />
            선택 영역 스포일러
          </button>
          <span className="text-xs text-zinc-500">
            텍스트를 드래그한 뒤 버튼을 누르세요.
          </span>
        </div>

        {ranges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {ranges.map((range, rangeIndex) => (
              <button
                key={`${partIndex}-${range.start}-${range.end}`}
                className="inline-flex max-w-full items-center gap-2 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-white"
                type="button"
                onClick={() => removeSpoilerRange(partIndex, rangeIndex)}
                title="스포일러 범위 삭제"
              >
                <span className="truncate">
                  {text.slice(range.start, range.end)}
                </span>
                <X aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  function addThreadItem() {
    setThreadItems((currentItems) => [...currentItems, ""]);
    setSpoilerRanges((currentRanges) => [...currentRanges, []]);

    if (!content && threadItems.length === 0) {
      setCreatedAt(new Date().toISOString());
    }
  }

  function updateThreadItem(index: number, value: string) {
    setThreadItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    );
    updateSpoilerRangesForPart(index + 1, value);
  }

  function removeThreadItem(index: number) {
    setThreadItems((currentItems) =>
      currentItems.filter((_, itemIndex) => itemIndex !== index),
    );
    setSpoilerRanges((currentRangeGroups) =>
      currentRangeGroups.filter((_, partIndex) => partIndex !== index + 1),
    );
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setImageError("");

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError("JPG, PNG, WebP 이미지만 첨부할 수 있습니다.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError("이미지는 8MB 이하로 첨부해 주세요.");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setIsUploadingImage(true);

    try {
      const response = await fetch("/api/uploads/images", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        message?: string;
        image?: {
          url?: string;
        };
      };

      if (!response.ok || !data.image?.url) {
        setImageError(data.message ?? "이미지를 업로드하지 못했습니다.");
        event.target.value = "";
        return;
      }

      setImageUrl(data.image.url);
      setImageName(file.name);
      setPlatforms(["threads"]);
    } catch {
      setImageError("이미지 업로드 중 문제가 발생했습니다.");
      event.target.value = "";
    } finally {
      setIsUploadingImage(false);
    }
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
    setTopicError("");
    setSpoilerError("");
    setResults(null);
    const mainPost = trimTextWithSpoilerRanges(
      content,
      spoilerRanges[0] ?? [],
    );

    if (!mainPost.text) {
      setError("게시글 내용을 입력해 주세요.");
      return;
    }

    if (platforms.length === 0) {
      setError("업로드할 플랫폼을 최소 1개 선택해 주세요.");
      return;
    }

    const trimmedThreadParts = threadItems.map((item, index) =>
      trimTextWithSpoilerRanges(item, spoilerRanges[index + 1] ?? []),
    );
    const trimmedThreadItems = trimmedThreadParts.map((part) => part.text);
    const emptyThreadItemIndex = trimmedThreadItems.findIndex((item) => !item);

    if (emptyThreadItemIndex >= 0) {
      setError(
        `${emptyThreadItemIndex + 2}번 타래 내용을 입력하거나 삭제해 주세요.`,
      );
      return;
    }

    if (platforms.includes("threads")) {
      const threadTextResults = [mainPost.text, ...trimmedThreadItems].map(
        validateThreadsText,
      );
      const invalidThreadIndex = threadTextResults.findIndex(
        (result) => !result.ok,
      );

      if (invalidThreadIndex >= 0) {
        setError(
          invalidThreadIndex === 0
            ? threadTextResults[invalidThreadIndex].message
            : `${invalidThreadIndex + 1}번 타래 글은 ${THREADS_TEXT_LIMIT}자를 초과할 수 없습니다.`,
        );
        return;
      }
    }

    const publishSpoilerRanges = [
      mainPost.ranges,
      ...trimmedThreadParts.map((part) => part.ranges),
    ];
    const hasTextSpoiler = publishSpoilerRanges.some(
      (ranges) => ranges.length > 0,
    );

    const topicTagResult = validateTopicTag(topicTag);

    if (!topicTagResult.ok) {
      setTopicError(topicTagResult.message);
      return;
    }

    if (isUploadingImage) {
      setError("이미지 업로드가 끝난 뒤 게시해 주세요.");
      return;
    }

    if (imageUrl && !platforms.includes("threads")) {
      setError("이미지 첨부 게시는 현재 Threads만 지원합니다.");
      return;
    }

    if (imageUrl && platforms.includes("x")) {
      setError("이미지 첨부 게시를 하려면 X 선택을 해제해 주세요.");
      return;
    }

    setIsPublishing(true);

    try {
      const response = await fetch("/api/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: mainPost.text,
          platforms,
          createdAt,
          imageUrl: imageUrl || undefined,
          isImageSpoiler: isImageSpoiler || undefined,
          spoilerRanges: hasTextSpoiler ? publishSpoilerRanges : undefined,
          topicTag: topicTagResult.value || undefined,
          threadItems:
            trimmedThreadItems.length > 0 ? trimmedThreadItems : undefined,
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
        setThreadItems([]);
        setSelectedPresetId(NO_AUTHOR_PRESET);
        setAppliedHeadline("");
        setSelectedTopicTag(NO_TOPIC_TAG);
        setCustomTopicTag("");
        setTopicError("");
        setSpoilerError("");
        setSpoilerRanges([[]]);
        setIsImageSpoiler(false);
        clearImage();
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
          <span
            className={`inline-flex h-8 w-fit items-center rounded-md px-2.5 text-sm font-semibold ${
              characterLimitState === "error"
                ? "bg-rose-50 text-rose-700"
                : characterLimitState === "warning"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {characterCount.toLocaleString("ko-KR")} / {THREADS_TEXT_LIMIT}자
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
          <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-zinc-800">
            <span>게시글 내용</span>
            <span
              className={`text-xs ${
                characterLimitState === "error"
                  ? "text-rose-700"
                  : characterLimitState === "warning"
                    ? "text-amber-700"
                    : "text-zinc-500"
              }`}
            >
              {characterCount >= THREADS_TEXT_WARNING_THRESHOLD
                ? `${THREADS_TEXT_LIMIT - characterCount}자 남음`
                : "Threads 500자 제한"}
            </span>
          </span>
          <textarea
            ref={(element) => {
              textAreaRefs.current[0] = element;
            }}
            className={`min-h-56 w-full resize-y rounded-md border bg-white p-4 text-base leading-7 text-zinc-950 shadow-sm transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-teal-700 ${
              characterLimitState === "error"
                ? "border-rose-300"
                : characterLimitState === "warning"
                  ? "border-amber-300"
                  : "border-zinc-300"
            }`}
            value={content}
            onChange={(event) => {
              if (!content) {
                setCreatedAt(new Date().toISOString());
              }
              const nextContent = event.target.value;
              setContent(nextContent);
              updateSpoilerRangesForPart(0, nextContent);
            }}
            placeholder="팀 계정에 업로드할 게시글을 작성하세요."
          />
          {renderSpoilerControls(0, content)}
          {characterLimitState === "error" ? (
            <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              Threads 게시글은 {THREADS_TEXT_LIMIT}자를 초과할 수 없습니다.
            </p>
          ) : characterLimitState === "warning" ? (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
              450자를 넘었습니다. 게시 전에 문장을 조금 더 압축해 보세요.
            </p>
          ) : null}
        </label>

        <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900">타래 작성</p>
              <p className="text-xs leading-5 text-zinc-500">
                추가 글은 첫 게시물 발행 후 reply_to_id로 이어 붙입니다.
              </p>
            </div>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-teal-700 bg-white px-3 text-sm font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50"
              type="button"
              onClick={addThreadItem}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              스레드에 추가
            </button>
          </div>

          {threadItems.length > 0 ? (
            <div className="mt-3 space-y-3">
              {threadItems.map((item, index) => {
                const info = characterInfo[index + 1] ?? getCharacterLimitState(item);
                const itemState = info.state;

                return (
                  <div
                    key={`thread-item-${index}`}
                    className="rounded-md border border-zinc-200 bg-white p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                        {index + 2}/{threadItems.length + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold ${
                            itemState === "error"
                              ? "text-rose-700"
                              : itemState === "warning"
                                ? "text-amber-700"
                                : "text-zinc-500"
                          }`}
                        >
                          {info.count.toLocaleString("ko-KR")} /{" "}
                          {THREADS_TEXT_LIMIT}자
                        </span>
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-zinc-600 transition hover:bg-zinc-50 hover:text-rose-700"
                          type="button"
                          onClick={() => removeThreadItem(index)}
                          title="타래 글 삭제"
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      ref={(element) => {
                        textAreaRefs.current[index + 1] = element;
                      }}
                      className={`min-h-32 w-full resize-y rounded-md border bg-white p-3 text-sm leading-6 text-zinc-950 shadow-sm transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-teal-700 ${
                        itemState === "error"
                          ? "border-rose-300"
                          : itemState === "warning"
                            ? "border-amber-300"
                            : "border-zinc-300"
                      }`}
                      value={item}
                      onChange={(event) =>
                        updateThreadItem(index, event.target.value)
                      }
                      placeholder={`${index + 2}번 타래 글을 작성하세요.`}
                    />
                    {renderSpoilerControls(index + 1, item)}
                    {itemState === "error" ? (
                      <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                        이 타래 글은 {THREADS_TEXT_LIMIT}자를 초과할 수 없습니다.
                      </p>
                    ) : itemState === "warning" ? (
                      <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                        {info.remaining.toLocaleString("ko-KR")}자 남았습니다.
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {spoilerError ? (
          <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
            {spoilerError}
          </p>
        ) : null}

        <div className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-teal-700">
              <Tag aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-zinc-900">주제 선택</p>
              <p className="text-xs leading-5 text-zinc-500">
                선택한 주제는 Threads Topic Tag로 함께 게시됩니다.
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.55fr)]">
            <label>
              <span className="sr-only">주제</span>
              <select
                className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-950 shadow-sm transition hover:border-zinc-400 focus:border-teal-700"
                value={selectedTopicTag}
                onChange={(event) => {
                  setSelectedTopicTag(event.target.value);
                  setTopicError("");
                }}
              >
                <option value={NO_TOPIC_TAG}>선택하지 않음</option>
                {TOPIC_TAG_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                <option value={CUSTOM_TOPIC_TAG}>직접 입력</option>
              </select>
            </label>

            {selectedTopicTag === CUSTOM_TOPIC_TAG ? (
              <label>
                <span className="sr-only">직접 입력 주제</span>
                <input
                  className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-950 shadow-sm transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-teal-700"
                  value={customTopicTag}
                  onChange={(event) => {
                    setCustomTopicTag(event.target.value);
                    setTopicError("");
                  }}
                  placeholder="예: 인디게임"
                />
              </label>
            ) : (
              <div className="flex h-11 items-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-500">
                {topicTag ? `# ${topicTag}` : "Topic Tag 없음"}
              </div>
            )}
          </div>

          {topicError ? (
            <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
              {topicError}
            </p>
          ) : null}
        </div>

        <div className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-teal-700">
                <ImageIcon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-zinc-900">이미지 첨부</p>
                <p className="text-xs leading-5 text-zinc-500">
                  첨부하면 업로드 대상이 Threads로 자동 전환됩니다.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                ref={imageInputRef}
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
              />
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:bg-zinc-100 disabled:text-zinc-400"
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploadingImage}
              >
                {isUploadingImage ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload aria-hidden="true" className="h-4 w-4" />
                )}
                {isUploadingImage ? "업로드 중" : imageUrl ? "변경" : "첨부"}
              </button>
              {imageUrl ? (
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50"
                  type="button"
                  onClick={clearImage}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  해제
                </button>
              ) : null}
            </div>
          </div>

          {imageUrl ? (
            <div className="mt-3 overflow-hidden rounded-md border border-zinc-200 bg-white">
              <div className="relative h-72 w-full">
                <Image
                  className="object-contain"
                  src={imageUrl}
                  alt={
                    imageName ? `${imageName} 미리보기` : "첨부 이미지 미리보기"
                  }
                  fill
                  sizes="(max-width: 768px) 100vw, 720px"
                  unoptimized
                />
              </div>
              <p className="border-t border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600">
                {imageName || "첨부 이미지"}
              </p>
            </div>
          ) : null}

          {imageUrl ? (
            <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2.5">
              <span className="text-sm font-semibold text-zinc-800">
                이미지를 스포일러로 표시
              </span>
              <input
                className="h-5 w-5 accent-teal-700"
                type="checkbox"
                checked={isImageSpoiler}
                onChange={(event) => setIsImageSpoiler(event.target.checked)}
              />
            </label>
          ) : null}

          {imageError ? (
            <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
              {imageError}
            </p>
          ) : null}
        </div>

        <div className="mt-5 space-y-3">
          <p className="text-sm font-semibold text-zinc-800">업로드 대상</p>
          <PlatformSelector selected={platforms} onChange={setPlatforms} />
        </div>

        <div className="mt-5">
          <PostPreview
            content={content}
            imageUrl={imageUrl}
            isImageSpoiler={isImageSpoiler}
            spoilerRanges={spoilerRanges}
            threadItems={threadItems}
            topicTag={topicTag}
          />
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-zinc-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Toast message={error} />
          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:bg-zinc-400 sm:w-auto"
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || hasCharacterLimitError}
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
