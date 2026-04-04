import { supabase } from './supabase';

// Function to fetch live seat data for a specific course
export const getLiveSeats = async (courseId: string) => {
  const { data, error } = await supabase
    .from('courses')
    .select('course_name, seats_available, waitlist_count')
    .eq('id', courseId)
    .single();

  if (error) {
    console.error("Error fetching seats:", error);
    return null;
  }
  return data;
};