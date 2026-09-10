"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NavBar() {
  const [user, setUser] = useState(null);
  const supabase = createClient();

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
    <div className="bg-ink text-paper">
      <div className="max-w-5xl mx-auto px-7 py-4 flex items-center justify-between flex-wrap gap-4">
        <Link href="/" className="font-display font-semibold text-lg">
          Scholar Print Studio
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/order/new" className="hover:text-cyanbright">
            Order a poster
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="hover:text-cyanbright">
                My orders
              </Link>
              <button onClick={signOut} className="hover:text-cyanbright">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-cyanbright">
                Log in
              </Link>
              <Link href="/signup" className="hover:text-cyanbright">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
