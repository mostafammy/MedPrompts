import { createClient } from '@libsql/client';

async function run() {
  const client = createClient({ url: 'file:./local.db' });
  const result = await client.execute('SELECT * FROM prompt_templates');
  console.log(JSON.stringify(result.rows, null, 2));
}
run();
