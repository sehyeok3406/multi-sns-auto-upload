import { randomUUID } from "node:crypto";
import type { PostHistoryEntry } from "@/lib/types";

type NewHistoryEntry = Omit<PostHistoryEntry, "id">;

const MAX_HISTORY_SIZE = 50;

const globalForHistory = globalThis as typeof globalThis & {
  __snsAutoUploadPostHistory?: PostHistoryEntry[];
};

const postHistory = (globalForHistory.__snsAutoUploadPostHistory ??= []);

export function addPostHistory(entry: NewHistoryEntry) {
  const historyEntry: PostHistoryEntry = {
    ...entry,
    id: randomUUID(),
  };

  postHistory.unshift(historyEntry);

  if (postHistory.length > MAX_HISTORY_SIZE) {
    postHistory.length = MAX_HISTORY_SIZE;
  }

  return historyEntry;
}

export function getPostHistory() {
  return [...postHistory].sort(
    (a, b) =>
      new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
  );
}
