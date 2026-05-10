// Next.js API route for locations.
import { pool } from "@/lib/db";

export async function GET() {
  const result = await pool.query(`
    SELECT l.*, c.name as campus_name
    FROM locations l
    join campuses c on l.campus_id = c.id
  `);

  return Response.json(result.rows);
}
