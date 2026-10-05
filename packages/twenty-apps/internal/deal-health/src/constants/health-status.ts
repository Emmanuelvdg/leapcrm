export const HEALTH_STATUS = {
  HEALTHY: 'HEALTHY',
  WATCH: 'WATCH',
  AT_RISK: 'AT_RISK',
} as const;

export type HealthStatus = (typeof HEALTH_STATUS)[keyof typeof HEALTH_STATUS];
