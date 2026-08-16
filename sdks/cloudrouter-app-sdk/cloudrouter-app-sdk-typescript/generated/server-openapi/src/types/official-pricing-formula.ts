import type { OfficialPricingFormulaTerm } from './official-pricing-formula-term';

/** Official pricing formula schema exposed by Cloud Router. */
export interface OfficialPricingFormula {
  /** Constant units field on official pricing formula. */
  constantUnits: string;
  /** Formula code field on official pricing formula. */
  formulaCode: string;
  /** Formula version field on official pricing formula. */
  formulaVersion: string;
  /** Maximum units field on official pricing formula. */
  maximumUnits?: string | null;
  /** Minimum units field on official pricing formula. */
  minimumUnits?: string | null;
  /** Quantity coefficient field on official pricing formula. */
  quantityCoefficient: string;
  /** Terms field on official pricing formula. */
  terms: OfficialPricingFormulaTerm[];
}
