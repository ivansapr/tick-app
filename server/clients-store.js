import { mkdirSync, readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

// Client registrations contain OAuth client metadata/secrets, never Tick credentials.
// One process must own this file. Put it on a persistent volume in deployments.
export function createClientsStore(file = resolve('.data/oauth-clients.json')) {
  let clients = new Map();
  try {
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    if (!Array.isArray(saved) || saved.some(c => typeof c.client_id !== 'string' || !Array.isArray(c.redirect_uris))) {
      throw new Error('Invalid OAuth client registration store');
    }
    clients = new Map(saved.map(client => [client.client_id, client]));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return {
    getClient(id) { return clients.get(id); },
    registerClient(client) {
      if (clients.size >= 10_000) throw new Error('OAuth client registration capacity reached');
      const registered = { ...client, client_id: randomBytes(32).toString('hex'), client_id_issued_at: Math.floor(Date.now() / 1000) };
      const updated = new Map(clients).set(registered.client_id, registered);
      mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
      const temporary = `${file}.${randomBytes(8).toString('hex')}.tmp`;
      try {
        writeFileSync(temporary, JSON.stringify([...updated.values()]), { mode: 0o600, flag: 'wx' });
        renameSync(temporary, file);
      } finally {
        rmSync(temporary, { force: true });
      }
      clients = updated;
      return registered;
    },
  };
}
