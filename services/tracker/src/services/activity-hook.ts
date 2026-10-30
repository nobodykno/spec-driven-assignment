import type { Transaction } from '@app/database';
import type { ActivityAction } from '@app/shared';

export interface ActivityEvent {
  taskId: string;
  actorId: string;
  action: ActivityAction;
  metadata: Record<string, unknown>;
}

// Hook point (DEV-11 D6): called inside the task's transaction. DEV-13 replaces the no-op with
// the real ActivityService so the change and its activity entry commit or roll back together.
export interface ActivityHook {
  record(tx: Transaction, event: ActivityEvent): Promise<void>;
}

export const noopActivityHook: ActivityHook = {
  record: async () => undefined,
};
