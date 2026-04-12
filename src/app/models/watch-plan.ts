export type WatchPlanStatus = 'queued' | 'scheduled' | 'paused' | 'completed';
export type WatchPlanPriority = 'high' | 'medium' | 'low';

export interface WatchPlanCompletionSnapshot {
  id: number;
  status: WatchPlanStatus;
  plannedFor: Date | null;
  updatedAt: Date;
}

export interface WatchPlanEntry {
  id: number;
  movieId: number;
  status: WatchPlanStatus;
  priority: WatchPlanPriority;
  plannedFor: Date | null;
  contextTag: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WatchPlanDraft {
  id?: number;
  movieId: number;
  status?: WatchPlanStatus;
  priority?: WatchPlanPriority;
  plannedFor?: Date | null;
  contextTag?: string;
  note?: string;
}