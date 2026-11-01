import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  errorResponse,
  jsonResponse,
  renderWithProviders,
  stubFetch,
} from '../../../test/test-helpers.tsx';
import { ActivityTimeline } from './activity-timeline.tsx';

const TASK = '00000000-0000-4000-8000-0000000000bb';
const ACTOR = '00000000-0000-4000-8000-000000000001';
const LIST = `GET /tasks/${TASK}/activity?page=1&pageSize=20`;
const NEWER = '2030-01-02T10:00:00.000Z';
const OLDER = '2030-01-01T10:00:00.000Z';

function entry(
  id: string,
  action: string,
  metadata: Record<string, unknown>,
  createdAt: string,
): object {
  return { id, taskId: TASK, actor: { id: ACTOR, name: 'Ada Owner' }, action, metadata, createdAt };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ActivityTimeline', () => {
  it('FR-UI-009: Timeline entries', async () => {
    const items = [
      entry(
        '00000000-0000-4000-8000-0000000000d1',
        'TASK_STATUS_CHANGED',
        { from: 'TODO', to: 'IN_PROGRESS' },
        NEWER,
      ),
      entry(
        '00000000-0000-4000-8000-0000000000d2',
        'TASK_CREATED',
        { title: 'Write', status: 'TODO', priority: 'HIGH' },
        OLDER,
      ),
    ];
    stubFetch({
      [LIST]: () =>
        jsonResponse({ items, meta: { page: 1, pageSize: 20, total: 2, totalPages: 1 } }),
    });
    renderWithProviders(<ActivityTimeline taskId={TASK} />);
    const entries = await screen.findAllByRole('listitem');
    expect(entries).toHaveLength(2);
    // Newest first: the order the API returns is kept.
    const [first, second] = entries as [HTMLElement, HTMLElement];
    expect(within(first).getByText('Ada Owner')).toBeTruthy();
    expect(first.textContent).toContain('changed the status');
    expect(first.textContent).toContain('TODO → IN_PROGRESS');
    expect(first.querySelector('time')?.getAttribute('dateTime')).toBe(NEWER);
    expect(second.textContent).toContain('created the task');
    expect(second.textContent).toContain('Write (TODO, HIGH)');
    expect(second.querySelector('time')?.getAttribute('dateTime')).toBe(OLDER);
  });

  it('FR-UI-009: Empty or failed', async () => {
    stubFetch({
      [LIST]: () =>
        jsonResponse({ items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }),
    });
    renderWithProviders(<ActivityTimeline taskId={TASK} />);
    expect(await screen.findByText('No activity yet.')).toBeTruthy();
    cleanup();

    let calls = 0;
    stubFetch({
      [LIST]: () => {
        calls += 1;
        return calls === 1
          ? errorResponse('INTERNAL_ERROR', 'Activity unavailable', 500)
          : jsonResponse({
              items: [entry('00000000-0000-4000-8000-0000000000d3', 'TASK_ARCHIVED', {}, NEWER)],
              meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
            });
      },
    });
    renderWithProviders(<ActivityTimeline taskId={TASK} />);
    expect((await screen.findByRole('alert')).textContent).toContain('Activity unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('archived the task')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
