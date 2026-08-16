import type { MediaResource } from './media-resource';

/** Settlement chart point schema exposed by Cloud Router. */
export interface SettlementChartPoint {
  /** Audio field on settlement chart point. */
  audio: MediaResource;
  /** Day field on settlement chart point. */
  day: string;
  /** Image field on settlement chart point. */
  image: MediaResource;
  /** Music field on settlement chart point. */
  music: MediaResource;
  /** Text field on settlement chart point. */
  text: string;
  /** Video field on settlement chart point. */
  video: MediaResource;
}
