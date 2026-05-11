"use client";

let clerkSupabaseTokenGetter: null | (() => Promise<string | null>) = null;

export function setClerkSupabaseTokenGetter(getter: () => Promise<string | null>) {
  clerkSupabaseTokenGetter = getter;
}

export function clearClerkSupabaseTokenGetter() {
  clerkSupabaseTokenGetter = null;
}

export async function getClerkSupabaseAccessToken() {
  if (!clerkSupabaseTokenGetter) return null;

  try {
    return await clerkSupabaseTokenGetter();
  } catch {
    return null;
  }
}
