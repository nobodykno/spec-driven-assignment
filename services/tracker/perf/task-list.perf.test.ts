import { getSequelize } from '@app/database';
import { performance } from 'node:perf_hooks';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, buildRealApp, closeConnection } from '../test/support/db.js';
import { summarize } from './stats.js';
import { seedPerfProject, TASK_COUNT, type PerfWorld } from './seed.js';

const P95_LIMIT_MS = 300;
const WARMUP = 20;
const REQUESTS = 200;

describe('task list performance with 10,000 tasks', () => {
  const app = buildRealApp();
  let world: PerfWorld;

  beforeAll(async () => {
    world = await seedPerfProject();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('NFR-PERF-002: the four task indexes exist in the migrated database', async () => {
    const [rows] = await getSequelize().query(
      "SELECT indexdef FROM pg_indexes WHERE tablename = 'tasks'",
    );
    const defs = (rows as { indexdef: string }[]).map((row) => row.indexdef);
    for (const columns of [
      '(project_id, archived_at, status)',
      '(project_id, assignee_id)',
      '(project_id, due_date)',
      '(project_id, priority)',
    ]) {
      expect(defs.some((def) => def.endsWith(columns))).toBe(true);
    }
  });

  it('NFR-PERF-001: pagination stays bounded with pageSize=100', async () => {
    const response = await request(app)
      .get(`/projects/${world.projectId}/tasks?pageSize=100`)
      .set(asUser(world.ownerId));
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(100);
    expect(response.body.meta.total).toBe(TASK_COUNT);
  });

  it('NFR-PERF-001: p95 of the task list is below 300 ms', async () => {
    const queries = [
      '',
      '?status=TODO',
      `?assigneeId=${world.assigneeId}`,
      '?sort=dueDate&order=asc',
      '?page=100&pageSize=50',
    ];
    const get = (query: string): request.Test =>
      request(app).get(`/projects/${world.projectId}/tasks${query}`).set(asUser(world.ownerId));
    for (let i = 0; i < WARMUP; i += 1) {
      await get(queries[i % queries.length] ?? '');
    }
    const samples: number[] = [];
    for (let i = 0; i < REQUESTS; i += 1) {
      const started = performance.now();
      const response = await get(queries[i % queries.length] ?? '');
      samples.push(performance.now() - started);
      expect(response.status).toBe(200);
    }
    const { p50, p95, max } = summarize(samples);
    process.stdout.write(
      `PERF task list (${TASK_COUNT} tasks, ${REQUESTS} requests): p50=${p50.toFixed(1)} ms p95=${p95.toFixed(1)} ms max=${max.toFixed(1)} ms\n`,
    );
    expect(p95, `measured p95 ${p95.toFixed(1)} ms`).toBeLessThan(P95_LIMIT_MS);
  });
});
