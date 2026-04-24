import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client bound to the current request cookies (user session) for Route Handlers.
 */
export async function createSupabaseRouteClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Cookie mutation can fail in some Server Component contexts; safe to ignore for read-heavy routes.
        }
      },
    },
  });
}

export type RouteAuthResult =
  | { user: { id: string; email?: string | null }; supabase: Awaited<ReturnType<typeof createSupabaseRouteClient>> }
  | { user: null; supabase: Awaited<ReturnType<typeof createSupabaseRouteClient>>; error: string };

export async function requireAuthUser(): Promise<RouteAuthResult> {
  const supabase = await createSupabaseRouteClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) {
    return {
      user: null,
      supabase,
      error: error?.message ?? "Not authenticated",
    };
  }
  return { user: userData.user, supabase };
}
