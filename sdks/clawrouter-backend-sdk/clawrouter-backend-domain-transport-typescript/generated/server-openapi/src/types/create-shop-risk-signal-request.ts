export interface CreateShopRiskSignalRequest {
  signalNo?: string;
  signalType: string;
  riskLevel: string;
  signalStatus: string;
  sourceType?: string;
  sourceId?: string;
  riskScore: number;
  payload: Record<string, unknown>;
  detectedAt?: string;
}
