import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres.rozgjdadvvreyteulavn:restomakan123@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres'
});
async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'order_items';
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  
  const res2 = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'foods';
  `);
  console.log(JSON.stringify(res2.rows, null, 2));
  await client.end();
}
run();
