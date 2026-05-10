// Next.js API route for notifications.
import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await pool.query(
    "SELECT * FROM notification_center ORDER BY created_at DESC"
  );
  return NextResponse.json(result.rows);
}
