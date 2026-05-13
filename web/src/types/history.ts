export interface AnalysisHistoryEntry {
  id: number;
  analyzed_at: string;
  youtube_video_id: string;
  video_url: string;
  video_title: string | null;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  total_predictions: number;
}

export interface AnalysisHistoryListResponse {
  items: AnalysisHistoryEntry[];
  total: number;
}
