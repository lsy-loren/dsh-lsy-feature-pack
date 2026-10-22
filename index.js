import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Host half of the 功能增强 (feature pack) bundle.
 *
 * It serves the two endpoints the Client's Session menu uses to delete a
 * session. The Harness exposes no session-delete API — session logs are
 * append-only and only archive is offered — so the route removes the session's
 * own storage directory and tells the Host that the session left the store,
 * which drops the row from every connected client.
 *
 * The image skin lives entirely in the Client half; it needs no Host service.
 *
 * Safety rules:
 * - only ids of the shipped shape are accepted (no path separators);
 * - a live session is stopped and detached before its files are removed;
 * - the session's descendant subagent sessions are removed first.
 */

const API_PREFIX = '/dsh-lsy-feature-pack/api';
const ID_PATTERN = /^session-[A-Za-z0-9_-]{1,120}$/;
const MAX_BODY_BYTES = 16 * 1024;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const inject = ['webServer'];

export function apply(ctx) {
  const sessionsRoot = () =>
    path.join(process.env.DSH_HOME ?? path.join(os.homedir(), '.dsh'), 'sessions');

  const persistence = () => {
    try {
      return ctx.get('sessionPersistence');
    } catch {
      return undefined;
    }
  };

  const listSnapshots = async () => {
    const service = persistence();
    if (service === undefined || typeof service.list !== 'function') return [];
    try {
      return await service.list();
    } catch {
      return [];
    }
  };

  /** Every stored session below `rootId`, parents before their children removed. */
  const descendantIds = (snapshots, rootId) => {
    const children = new Map();
    for (const snapshot of snapshots) {
      const header = snapshot?.header;
      if (!header?.id || !header.parentSession) continue;
      const bucket = children.get(header.parentSession) ?? [];
      bucket.push(header.id);
      children.set(header.parentSession, bucket);
    }
    const result = [];
    const queue = [rootId];
    const seen = new Set(queue);
    while (queue.length > 0) {
      const current = queue.shift();
      for (const child of children.get(current) ?? []) {
        if (seen.has(child)) continue;
        seen.add(child);
        result.push(child);
        queue.push(child);
      }
    }
    return result;
  };

  const sessionFor = (id) => {
    try {
      const sessions = ctx.get('sessions');
      return sessions?.get?.(id);
    } catch {
      return undefined;
    }
  };

  const agentFor = (id) => {
    try {
      const agents = ctx.get('agents');
      return agents?.get?.(id);
    } catch {
      return undefined;
    }
  };

  /** Stop a live session, flush it, and detach it from the in-memory store. */
  const detach = async (id) => {
    const sessions = (() => {
      try {
        return ctx.get('sessions');
      } catch {
        return undefined;
      }
    })();
    const session = sessionFor(id);
    const agent = agentFor(id);

    if (agent !== undefined) {
      try {
        agent.cancel?.({ kind: 'disposed' });
      } catch {
        /* best effort */
      }
      try {
        await Promise.race([Promise.resolve(agent.scope?.dispose?.()), sleep(1500)]);
      } catch {
        /* best effort */
      }
    }

    if (session !== undefined && typeof sessions?.flush === 'function') {
      try {
        await sessions.flush(session);
      } catch {
        /* best effort */
      }
    }

    let detached = false;
    try {
      const entry = sessions?.store?.get?.(id);
      if (entry !== undefined && typeof entry.detach === 'function') {
        entry.detach();
        detached = true;
        await sleep(300);
      }
    } catch {
      /* best effort */
    }
    return { live: session !== undefined || agent !== undefined, detached };
  };

  /** Tell the Host and every connected client that the session no longer exists. */
  const notifyRemoved = (id) => {
    try {
      ctx.emit('session/disposed', { id });
    } catch {
      /* best effort */
    }
  };

  /** Remove `<sessions>/<project>/<id>` wherever the project directory is. */
  const removeFiles = async (id) => {
    let projects;
    try {
      projects = await fs.readdir(sessionsRoot(), { withFileTypes: true });
    } catch {
      return 0;
    }
    let removed = 0;
    for (const project of projects) {
      if (!project.isDirectory()) continue;
      const directory = path.join(sessionsRoot(), project.name, id);
      let isDirectory = false;
      try {
        isDirectory = (await fs.stat(directory)).isDirectory();
      } catch {
        continue;
      }
      if (!isDirectory) continue;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          await fs.rm(directory, { recursive: true, force: true });
          removed += 1;
          break;
        } catch {
          await sleep(250);
        }
      }
    }
    return removed;
  };

  const deleteSession = async (id) => {
    const state = await detach(id);
    const files = await removeFiles(id);
    if (!state.detached) notifyRemoved(id);
    return { id, live: state.live, files };
  };

  const readJsonBody = (request) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      request.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) {
          reject(new Error('request body is too large'));
          request.destroy();
          return;
        }
        chunks.push(chunk);
      });
      request.on('end', () => {
        try {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve(text.trim() === '' ? {} : JSON.parse(text));
        } catch (error) {
          reject(error);
        }
      });
      request.on('error', reject);
    });

  const reply = (response, status, body) => {
    const data = JSON.stringify(body);
    response.statusCode = status;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.setHeader('cache-control', 'no-store');
    response.end(data);
  };

  const handler = async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      const pathname = url.pathname.startsWith(API_PREFIX)
        ? url.pathname.slice(API_PREFIX.length) || '/'
        : '/';

      if (request.method === 'GET' && pathname.replace(/\/+$/, '') === '/preview') {
        const id = (url.searchParams.get('sessionId') ?? '').trim();
        if (!ID_PATTERN.test(id)) {
          reply(response, 400, { ok: false, error: 'invalid sessionId' });
          return;
        }
        const snapshots = await listSnapshots();
        const live = sessionFor(id) !== undefined || agentFor(id) !== undefined;
        reply(response, 200, {
          ok: true,
          result: { subagentCount: descendantIds(snapshots, id).length, live },
        });
        return;
      }

      if (request.method === 'POST' && pathname.replace(/\/+$/, '') === '/delete') {
        const body = await readJsonBody(request);
        const id = (typeof body?.sessionId === 'string' ? body.sessionId : '').trim();
        if (!ID_PATTERN.test(id)) {
          reply(response, 400, { ok: false, error: 'invalid sessionId' });
          return;
        }
        const snapshots = await listSnapshots();
        const known = snapshots.some((snapshot) => snapshot?.header?.id === id);
        const live = sessionFor(id) !== undefined || agentFor(id) !== undefined;
        if (!known && !live) {
          reply(response, 404, { ok: false, error: 'session not found' });
          return;
        }
        const ids = [id, ...descendantIds(snapshots, id)];
        const deleted = [];
        for (const target of [...ids].reverse()) {
          deleted.push(await deleteSession(target));
        }
        reply(response, 200, { ok: true, result: { deleted } });
        return;
      }

      reply(response, 404, { ok: false, error: 'unknown endpoint' });
    } catch (error) {
      reply(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  ctx.effect(
    () => ctx.webServer.register({ kind: 'prefix', path: API_PREFIX, handler }),
    'feature-pack: session delete route',
  );
}
