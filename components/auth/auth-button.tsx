"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { LogOut, UserCircle } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthButton() {
  const supabase = getSupabaseBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  if (loading) {
    return (
      <span className="hidden h-9 w-20 animate-pulse rounded-lg bg-foreground/10 sm:inline-flex" />
    );
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
      >
        <UserCircle className="h-4 w-4" />
        Đăng nhập
      </Link>
    );
  }

  const email = session.user.email ?? "Account";

  return (
    <button
      type="button"
      onClick={() => void supabase?.auth.signOut()}
      title={email}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden max-w-28 truncate lg:inline">{email}</span>
      <span className="lg:hidden">Thoát</span>
    </button>
  );
}
