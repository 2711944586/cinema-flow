export interface SmartPickCriteria {
  maxDuration: number | null;
  minRating: number;
  includeGenres: string[];
  excludeGenres: string[];
  allowWatched: boolean;
  preferFavorites: boolean;
  onlyWatchlist: boolean;
  preferredLanguages: string[];
}

export interface ViewingPreset extends SmartPickCriteria {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ViewingPresetDraft extends SmartPickCriteria {
  id?: number;
  name: string;
}

export const DEFAULT_SMART_PICK_CRITERIA: SmartPickCriteria = {
  maxDuration: 150,
  minRating: 7.5,
  includeGenres: [],
  excludeGenres: [],
  allowWatched: false,
  preferFavorites: true,
  onlyWatchlist: false,
  preferredLanguages: []
};