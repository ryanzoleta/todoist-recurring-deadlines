"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";

export function EnabledToggle({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Switch
      checked={enabled}
      onCheckedChange={(next) => {
        setEnabled(next);
        startTransition(async () => {
          const res = await fetch("/api/settings/enabled", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled: next }),
          });
          if (!res.ok) {
            setEnabled(!next);
            return;
          }
          router.refresh();
        });
      }}
      aria-label={enabled ? "Disable service" : "Enable service"}
    />
  );
}
