"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignInButton() {
  const [pending, setPending] = useState(false);

  return (
    <Button
      size="lg"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await authClient.signIn.oauth2({
            providerId: "todoist",
            callbackURL: "/dashboard",
            errorCallbackURL: "/?error=oauth",
          });
        } catch {
          setPending(false);
        }
      }}
    >
      {pending ? "Redirecting…" : "Sign in with Todoist"}
    </Button>
  );
}
