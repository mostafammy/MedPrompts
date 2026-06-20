import { versionPrefix } from '../src/lib/prompts/cache-key';

async function deleteVersionFromKV(
  kv: KVNamespace,
  subjectId: string,
  semver: string
): Promise<number> {
  const prefix = `prompt:${subjectId}:`;
  const marker = `-v${semver.split('.').slice(0, 2).join('-')}-`;
  let deletedCount = 0;
  let cursor: string | undefined;

  do {
    const list = await kv.list({ prefix, cursor });
    const toDelete = list.keys.filter(k => k.name.includes(marker));
    await Promise.allSettled(toDelete.map(k => kv.delete(k.name)));
    deletedCount += toDelete.length;
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);

  return deletedCount;
}

async function deleteSubjectFromKV(
  kv: KVNamespace,
  subjectId: string
): Promise<number> {
  const prefix = `prompt:${subjectId}:`;
  let deletedCount = 0;
  let cursor: string | undefined;

  do {
    const list = await kv.list({ prefix, cursor });
    await Promise.allSettled(list.keys.map(k => kv.delete(k.name)));
    deletedCount += list.keys.length;
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);

  return deletedCount;
}

export type Env = {
  PROMPT_CACHE_KV: KVNamespace;
};

export type MessageBody = {
  subjectId: string;
  semver: string;
  scope: 'VERSION' | 'SUBJECT';
};

export default {
  async queue(
    batch: { messages: { body: MessageBody; ack: () => void; retry: (opts: { delaySeconds: number }) => void }[] },
    env: Env
  ): Promise<void> {
    for (const msg of batch.messages) {
      const { subjectId, semver, scope } = msg.body;
      try {
        const deleted = scope === 'SUBJECT'
          ? await deleteSubjectFromKV(env.PROMPT_CACHE_KV, subjectId)
          : await deleteVersionFromKV(env.PROMPT_CACHE_KV, subjectId, semver);

        console.log(`Queue invalidation succeeded: subject=${subjectId}, scope=${scope}, deleted=${deleted}`);
        msg.ack();
      } catch (e) {
        console.error(`Queue invalidation failed (will retry): subject=${subjectId}, error=${e}`);
        msg.retry({ delaySeconds: 60 });
      }
    }
  },
};
