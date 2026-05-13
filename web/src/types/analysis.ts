export interface YouTubeVideoMetadata {
  title: string;
  thumbnail_url: string;
  view_count: number;
  like_count: number;
  comment_count_total: number | null;
}

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

export interface AnalyzeCommentResult {
  youtube_comment_id: string;
  author: string | null;
  text_original: string;
  sentiment: string;
  confidence: number;
  predicted_at: string;
  published_at: string | null;
}

export interface AnalyzeCommentsResponse {
  video_id: string;
  video_url: string;
  video: YouTubeVideoMetadata;
  sentiment_breakdown: SentimentBreakdown;
  total_comments: number;
  total_predictions: number;
  predictions: AnalyzeCommentResult[];
}
