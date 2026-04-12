import { WatchPlanCompletionSnapshot } from './watch-plan';

export interface WatchLogEntry {
  id: number;
  movieId: number;
  watchedAt: Date;
  location: string;
  companion: string;
  moodTags: string[];
  sessionRating: number | null;
  note: string;
  isRewatch: boolean;
  autoMarkedWatched: boolean;
  autoAssignedUserRating: boolean;
  completedPlanSnapshot: WatchPlanCompletionSnapshot | null;
  createdAt: Date;
}

export interface WatchLogDraft {
  movieId: number;
  watchedAt?: Date;
  location?: string;
  companion?: string;
  moodTags?: string[];
  sessionRating?: number | null;
  note?: string;
  isRewatch?: boolean;
}