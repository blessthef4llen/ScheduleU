import { supabase } from "@/utils/supabase";

export type Program = {
  id: number;
  program_code: string;
  program_name: string;
  program_type: string;
};

export async function getPrograms(): Promise<Program[]> {
  const { data, error } = await supabase
    .from("programs")
    .select("id, program_code, program_name, program_type")
    .order("program_name", { ascending: true });

  if (error) {
    console.error("Programs error:", error);
    return [];
  }

  return data ?? [];
}