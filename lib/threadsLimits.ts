export const THREADS_TEXT_LIMIT = 500;
export const THREADS_TEXT_WARNING_THRESHOLD = 450;

export function countThreadsTextCharacters(value: string) {
  return Array.from(value).length;
}

export function validateThreadsText(value: string) {
  const count = countThreadsTextCharacters(value);

  if (count > THREADS_TEXT_LIMIT) {
    return {
      ok: false as const,
      count,
      message: `Threads 게시글은 ${THREADS_TEXT_LIMIT}자 이하로 작성해 주세요.`,
    };
  }

  return {
    ok: true as const,
    count,
    message: "",
  };
}
