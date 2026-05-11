"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { clearClerkSupabaseTokenGetter, setClerkSupabaseTokenGetter } from "@/lib/clerkSupabase";

export function ClerkSupabaseBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setClerkSupabaseTokenGetter(async () => (await getToken()) ?? null);

    return () => {
      clearClerkSupabaseTokenGetter();
    };
  }, [getToken]);

  return null;
}
