"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NavBar() {
  const [user, setUser] = useState(null);
  const supabase = createClient();
  const fullName = user?.user_metadata?.full_name;
  const displayName =
    typeof fullName === "string" && fullName.trim()
      ? fullName.trim()
      : user?.email ?? "Account";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="site-dot-surface border-b border-ink/15 text-ink">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-3 font-display text-lg font-bold tracking-tight">
          <Image
            src="/scholar-print-mark.svg"
            width={42}
            height={40}
            alt=""
            priority
          />
          <span>Scholar Print Studio</span>
        </Link>
        <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
          <Link href="/order/new" className="hover:text-cyan">
            Order a poster
          </Link>
          {user ? (
            <>
              <span className="font-mono text-[10px] uppercase tracking-wide text-ink/60">
                Signed in as{" "}
                <span className="font-display text-xs font-semibold normal-case tracking-normal text-ink">
                  {displayName}
                </span>
              </span>
              <Link href="/dashboard" className="hover:text-cyan">
                My orders
              </Link>
              <button onClick={signOut} className="hover:text-cyan">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-cyan">
                Log in
              </Link>
              <Link href="/signup" className="hover:text-cyan">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
