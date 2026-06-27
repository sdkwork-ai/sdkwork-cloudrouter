/** Dashboard chart point schema exposed by Claw Router. */
export interface DashboardChartPoint {
  /** Audio whisper field on dashboard chart point. */
  'audio (Whisper)': number;
  /** Image midjourney field on dashboard chart point. */
  'image (Midjourney/DALL-E)': number;
  /** Llm text field on dashboard chart point. */
  'llm (Text)': number;
  /** Music suno field on dashboard chart point. */
  'music (Suno)': number;
  /** Time field on dashboard chart point. */
  time: string;
  /** Video runway sora field on dashboard chart point. */
  'video (Runway/Sora)': number;
}
