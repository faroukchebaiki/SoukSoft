import { Store } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import type { AuthScreenProps, LoginPayload, RegisterPayload } from "@/types";

/**
 * Entry screen that handles both login and first-time registration flows.
 */
export function AuthScreen({ mode, canRegister, error, onModeToggle, onLogin, onRegister }: AuthScreenProps) {
  const effectiveMode = canRegister ? mode : "login";
  const isLogin = effectiveMode === "login";
  const [loginForm, setLoginForm] = useState<LoginPayload>({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState<RegisterPayload>({
    firstName: "",
    lastName: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLogin) {
      onLogin(loginForm);
    } else {
      onRegister(registerForm);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-3xl border border-border/50 bg-card p-8 shadow-2xl">
        <div className="mb-6 space-y-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold">SoukSoft</h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Sign in to your workspace" : "Create a new admin account"}
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {isLogin ? (
            <>
              <label className="block text-sm font-medium">
                Username
                <input
                  className="mt-1 w-full rounded-2xl border border-border/60 bg-background px-3 py-2 text-sm"
                  value={loginForm.username}
                  onChange={(event) =>
                    setLoginForm((previous) => ({ ...previous, username: event.target.value }))
                  }
                />
              </label>
              <label className="block text-sm font-medium">
                Password
                <input
                  type="password"
                  className="mt-1 w-full rounded-2xl border border-border/60 bg-background px-3 py-2 text-sm"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((previous) => ({ ...previous, password: event.target.value }))
                  }
                />
              </label>
            </>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm font-medium">
                  First name
                  <input
                    className="mt-1 w-full rounded-2xl border border-border/60 bg-background px-3 py-2 text-sm"
                    value={registerForm.firstName}
                    onChange={(event) =>
                      setRegisterForm((previous) => ({ ...previous, firstName: event.target.value }))
                    }
                  />
                </label>
                <label className="block text-sm font-medium">
                  Last name
                  <input
                    className="mt-1 w-full rounded-2xl border border-border/60 bg-background px-3 py-2 text-sm"
                    value={registerForm.lastName}
                    onChange={(event) =>
                      setRegisterForm((previous) => ({ ...previous, lastName: event.target.value }))
                    }
                  />
                </label>
              </div>
              <label className="block text-sm font-medium">
                Username
                <input
                  className="mt-1 w-full rounded-2xl border border-border/60 bg-background px-3 py-2 text-sm"
                  value={registerForm.username}
                  onChange={(event) =>
                    setRegisterForm((previous) => ({ ...previous, username: event.target.value }))
                  }
                />
              </label>
              <label className="block text-sm font-medium">
                Password
                <input
                  type="password"
                  className="mt-1 w-full rounded-2xl border border-border/60 bg-background px-3 py-2 text-sm"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((previous) => ({ ...previous, password: event.target.value }))
                  }
                />
              </label>
              <label className="block text-sm font-medium">
                Confirm password
                <input
                  type="password"
                  className="mt-1 w-full rounded-2xl border border-border/60 bg-background px-3 py-2 text-sm"
                  value={registerForm.confirmPassword}
                  onChange={(event) =>
                    setRegisterForm((previous) => ({
                      ...previous,
                      confirmPassword: event.target.value,
                    }))
                  }
                />
              </label>
            </>
          )}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full rounded-2xl py-2">
            {isLogin ? "Sign in" : "Create account"}
          </Button>
        </form>
        {canRegister ? (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "Need an account?" : "Already registered?"}{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={onModeToggle}
            >
              {isLogin ? "Create one" : "Sign in"}
            </button>
          </div>
        ) : (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            An admin is already set up. Please sign in to continue.
          </div>
        )}
      </div>
    </div>
  );
}
