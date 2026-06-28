"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [isSigningOut, setSigningOut] = useState(false);

  async function logout() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} disabled={isSigningOut}>
      {isSigningOut ? "Logging out..." : "Log out"}
    </button>
  );
}
