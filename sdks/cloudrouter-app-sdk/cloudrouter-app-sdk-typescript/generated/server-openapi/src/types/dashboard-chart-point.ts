/** Dashboard chart point schema exposed by Cloud Router. */
export interface DashboardChartPoint {
  /** Audio whisper field on dashboard chart point. */
  'audio (Whisper)': number;
  /** Audio whisper cost field on dashboard chart point. */
  'audio (Whisper) cost': number;
  /** Image midjourney field on dashboard chart point. */
  'image (Midjourney/DALL-E)': number;
  /** Image midjourney cost field on dashboard chart point. */
  'image (Midjourney/DALL-E) cost': number;
  /** Llm text field on dashboard chart point. */
  'llm (Text)': number;
  /** Llm text cost field on dashboard chart point. */
  'llm (Text) cost': number;
  /** Music suno field on dashboard chart point. */
  'music (Suno)': number;
  /** Music suno cost field on dashboard chart point. */
  'music (Suno) cost': number;
  /** Time field on dashboard chart point. */
  time: string;
  /** Video runway sora field on dashboard chart point. */
  'video (Runway/Sora)': number;
  /** Video runway sora cost field on dashboard chart point. */
  'video (Runway/Sora) cost': number;
}
