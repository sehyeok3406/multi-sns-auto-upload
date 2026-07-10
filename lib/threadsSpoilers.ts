import type { ThreadsSpoilerRange } from "@/lib/types";

export const THREADS_TEXT_SPOILER_LIMIT = 10;

export type ThreadsSpoilerTextEntity = {
  entity_type: "SPOILER";
  offset: number;
  length: number;
};

function countCodePoints(value: string) {
  return Array.from(value).length;
}

export function normalizeSpoilerRanges(
  text: string,
  ranges: ThreadsSpoilerRange[],
) {
  const textLength = text.length;
  const normalized = ranges
    .map((range) => ({
      start: Math.max(0, Math.min(range.start, range.end, textLength)),
      end: Math.max(0, Math.min(Math.max(range.start, range.end), textLength)),
    }))
    .filter((range) => range.end > range.start)
    .sort((left, right) => left.start - right.start || left.end - right.end);

  return normalized.reduce<ThreadsSpoilerRange[]>((merged, range) => {
    const previous = merged.at(-1);

    if (!previous || range.start > previous.end) {
      merged.push(range);
      return merged;
    }

    previous.end = Math.max(previous.end, range.end);
    return merged;
  }, []);
}

export function createSpoilerTextEntities(
  text: string,
  ranges: ThreadsSpoilerRange[],
): ThreadsSpoilerTextEntity[] {
  return normalizeSpoilerRanges(text, ranges)
    .slice(0, THREADS_TEXT_SPOILER_LIMIT)
    .map((range) => ({
      entity_type: "SPOILER" as const,
      offset: countCodePoints(text.slice(0, range.start)),
      length: countCodePoints(text.slice(range.start, range.end)),
    }))
    .filter((entity) => entity.length > 0);
}

export function trimTextWithSpoilerRanges(
  text: string,
  ranges: ThreadsSpoilerRange[],
) {
  const trimStartOffset = text.length - text.trimStart().length;
  const trimmedText = text.trim();
  const trimEndOffset = trimStartOffset + trimmedText.length;
  const adjustedRanges = ranges.map((range) => ({
    start: Math.max(range.start, trimStartOffset) - trimStartOffset,
    end: Math.min(range.end, trimEndOffset) - trimStartOffset,
  }));

  return {
    text: trimmedText,
    ranges: normalizeSpoilerRanges(trimmedText, adjustedRanges),
  };
}
