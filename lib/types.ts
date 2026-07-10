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

export type PublishErrorDetail = {
  source: string;
  stage?: string;
  stageLabel?: string;
  itemIndex?: number;
  itemLabel?: string;
  httpStatus?: number;
  code?: number | string;
  subcode?: number | string;
  type?: string;
  traceId?: string;
  title?: string;
  message?: string;
  userMessage?: string;
  retryHint?: string;
};

export type PublishResult = {
  platform: Platform;
  success: boolean;
  message: string;
  postedAt: string;
  errorDetail?: PublishErrorDetail;
  mockPostId?: string;
  postId?: string;
  threadPostIds?: string[];
  postUrl?: string;
};

export type ThreadsSpoilerRange = {
  start: number;
  end: number;
};

export type ThreadsPostMedia = {
  imageUrl?: string;
  imageName?: string;
  isImageSpoiler?: boolean;
};

export type PostHistoryEntry = {
  id: string;
  content: string;
  threadItems?: string[];
  platforms: Platform[];
  imageUrl?: string;
  isImageSpoiler?: boolean;
  threadMedia?: ThreadsPostMedia[];
  topicTag?: string;
  spoilerRanges?: ThreadsSpoilerRange[][];
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

export type ThreadsMediaSummary = {
  id: string;
  text?: string;
  username?: string;
  timestamp?: string;
  permalink?: string;
  mediaType?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  shortcode?: string;
};

export type ThreadsReply = ThreadsMediaSummary;

export type ThreadsReplyPublishResult = {
  success: boolean;
  message: string;
  postedAt: string;
  postId?: string;
  postUrl?: string;
};

export type ThreadsInsightMetric =
  | "views"
  | "likes"
  | "replies"
  | "reposts"
  | "quotes"
  | "shares";

export type ThreadsInsightValues = Record<ThreadsInsightMetric, number>;

export type ThreadsPostInsight = {
  post: ThreadsMediaSummary;
  metrics: ThreadsInsightValues;
  engagement: number;
  engagementRate: number;
  errorMessage?: string;
};

export type ThreadsInsightsSummary = {
  posts: ThreadsPostInsight[];
  totals: ThreadsInsightValues & {
    engagement: number;
    engagementRate: number;
  };
  checkedAt: string;
};
