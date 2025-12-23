export interface Notification {
  id: string;
  title: string;
  message: string;
  type?: string; // e.g., 'analysis_ready'
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string; // ISO date
}
