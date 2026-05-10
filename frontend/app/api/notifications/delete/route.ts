// Next.js API route for notifications delete.
import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { id } = await req.json();

  await pool.query("DELETE FROM notification_center WHERE id = $1", [id]);

  return NextResponse.json({ success: true });
}
