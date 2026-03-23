import { pool } from "@/lib/db";

export async function GET() {
  const result = await pool.query(`
    SELECT t.*, c1.name as from_name, c2.name as to_name
    FROM travel_alerts t
    join campuses c1 on t.from_campus = c1.id
    join campuses c2 on t.to_campus = c2.id
    ORDER BY created_at desc
  `);

  return Response.json(result.rows);
}
