"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppleIcon, GoogleGIcon } from "@/components/elements/brands/brand-icons";
import { IssueHubWordmark } from "@/components/elements/brands/issuehub-wordmark";
import { signIn } from "next-auth/react";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,        // we'll navigate manually
      email,
      password,
      callbackUrl: next,      // optional; used if redirect: true
    });

    setLoading(false);

    // res can be: { ok: boolean; error?: string | null; status: number; url?: string | null }
    if (!res || res.error) {
      // NextAuth returns "CredentialsSignin" on bad creds
      setError(res?.error === "CredentialsSignin"
        ? "Invalid email or password."
        : res?.error || "Login failed.");
      return;
    }

    // success - take them where they wanted
    router.replace(next);
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={onSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <Link href="/login" className="flex flex-col items-center gap-2 font-medium select-none">
              <div className="flex items-center justify-center rounded-md">
                {/* Animated wordmark */}
                <IssueHubWordmark
                  as="h1"
                  size="text-7xl"
                  className="mb-2"
                  waveFollowCursor={false}
                />
              </div>
              <span className="sr-only">IssueHub</span>
            </Link>

            <h2 className="text-xl font-bold">Welcome to the hub.</h2>
            <div className="text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="underline underline-offset-4">
                Sign up
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="grid gap-3">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && <p className="text-sm text-red-500 -mt-2">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </Button>
          </div>

          <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
            <span className="bg-background text-muted-foreground relative z-10 px-2">
              Or
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Button variant="outline" type="button" className="w-full" disabled>
              <AppleIcon className="h-4 w-4" />
              Continue with Apple
            </Button>
            <Button variant="outline" type="button" className="w-full" disabled>
              <GoogleGIcon className="h-4 w-4" />
              Continue with Google
            </Button>
          </div>
        </div>
      </form>

      <div className="text-muted-foreground text-center text-xs text-balance">
        By clicking continue, you agree to our{" "}
        <a href="#" className="underline underline-offset-4">Terms of Service</a>{" "}
        and{" "}
        <a href="#" className="underline underline-offset-4">Privacy Policy</a>.
      </div>
    </div>
  );
}

