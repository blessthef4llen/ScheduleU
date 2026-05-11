"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

const AUTH_PAGES = new Set(["/login", "/signup"]);

export function AuthSessionManager() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const supabase = getSupabase();

    const syncInitialSession = Promise.resolve().then(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session && pathname && AUTH_PAGES.has(pathname)) {
        router.replace("/dashboard");
        return;
      }
      router.refresh();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && pathname && AUTH_PAGES.has(pathname)) {
        router.replace("/dashboard");
        return;
      }

      if (event === "SIGNED_OUT" && pathname && !AUTH_PAGES.has(pathname)) {
        router.refresh();
        return;
      }

      if (session) {
        router.refresh();
      }
    });

    void syncInitialSession;

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
