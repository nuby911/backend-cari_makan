import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres.rozgjdadvvreyteulavn:restomakan123@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres'
});
async function run() {
  await client.connect();
  try {
    await client.query('ALTER TABLE foods ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;');
    console.log('Successfully added is_deleted column to foods table.');
  } catch(e) {
    console.error(e);
  }
  await client.end();
}
run();
