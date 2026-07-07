export interface FieldError {
  code?: number;
  field: string;
  i18nKey?: string;
  message: string;
  params?: Record<string, string | number | number | boolean>;
}
