import { useState, type JSX } from 'react';
import { QueryState } from '../../../components/query-state.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { Card } from '../../../components/ui/card.tsx';
import { useActivityQuery } from '../api/activity-api.ts';
import { actionLabel, describeActivity } from '../lib/describe-activity.ts';

// FR-UI-009: newest first, paginated.
export function ActivityTimeline({ taskId }: { taskId: string }): JSX.Element {
  const [page, setPage] = useState(1);
  const activity = useActivityQuery(taskId, page);
  const meta = activity.data?.meta;
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Activity</h2>
      <QueryState
        isLoading={activity.isPending}
        error={activity.error}
        isEmpty={activity.data?.items.length === 0}
        emptyMessage="No activity yet."
        onRetry={() => void activity.refetch()}
      >
        <ol className="flex flex-col gap-3 border-l-2 border-slate-200 pl-4">
          {activity.data?.items.map((entry) => (
            <li key={entry.id}>
              <p>
                <strong>{entry.actor.name}</strong> {actionLabel(entry.action)}
              </p>
              <p className="text-sm text-slate-500">
                {describeActivity(entry)}
                {describeActivity(entry) ? ' · ' : ''}
                <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time>
              </p>
            </li>
          ))}
        </ol>
      </QueryState>
      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center gap-3 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Newer
          </Button>
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Older
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
