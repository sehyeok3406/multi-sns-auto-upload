export type Platform = "x" | "threads";

export type PlatformAccountStatus = {
  connected: boolean;
  message: string;
  requiredEnv: string[];
  missingEnv: string[];
};

export type AccountStatuses = {
  x: PlatformAccountStatus;
  threads: PlatformAccountStatus;
  checkedAt: string;
};

export type PublishResult = {
  platform: Platform;
  success: boolean;
  message: string;
  postedAt: string;
  mockPostId?: string;
  postId?: string;
  postUrl?: string;
};

export type PostHistoryEntry = {
  id: string;
  content: string;
  platforms: Platform[];
  results: PublishResult[];
  createdAt: string;
  requestedAt: string;
  errorMessage?: string;
};

export type AuthorPreset = {
  id: string;
  name: string;
  headline: string;
  createdAt: string;
  updatedAt: string;
};
