"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOutEverywhere } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      await signOutEverywhere();
      router.push("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
