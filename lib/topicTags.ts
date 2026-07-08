export const NO_TOPIC_TAG = "none";
export const CUSTOM_TOPIC_TAG = "custom";

export const TOPIC_TAG_OPTIONS = [
  { label: "게임 기록", value: "게임 기록" },
  { label: "개발 일지", value: "개발 일지" },
  { label: "업데이트", value: "업데이트" },
  { label: "공지", value: "공지" },
  { label: "질문", value: "질문" },
  { label: "회고", value: "회고" },
  { label: "밈", value: "밈" },
] as const;

export function normalizeTopicTag(value: string) {
  return value.replace(/^#+/, "").replace(/\s+/g, " ").trim();
}

export function validateTopicTag(value: string) {
  const topicTag = normalizeTopicTag(value);

  if (!topicTag) {
    return { ok: true as const, value: "" };
  }

  if (topicTag.length > 50) {
    return {
      ok: false as const,
      message: "주제는 50자 이하로 입력해 주세요.",
    };
  }

  if (/[.&]/.test(topicTag)) {
    return {
      ok: false as const,
      message: "주제에는 마침표(.)와 앰퍼샌드(&)를 사용할 수 없습니다.",
    };
  }

  return { ok: true as const, value: topicTag };
}
