/** Admin auth verification policy schema exposed by Claw Router. */
export interface AdminAuthVerificationPolicy {
  /** Email code login enabled field on admin auth verification policy. */
  emailCodeLoginEnabled?: boolean;
  /** Email registration verification required field on admin auth verification policy. */
  emailRegistrationVerificationRequired?: boolean;
  /** Phone code login enabled field on admin auth verification policy. */
  phoneCodeLoginEnabled?: boolean;
  /** Phone registration verification required field on admin auth verification policy. */
  phoneRegistrationVerificationRequired?: boolean;
}
