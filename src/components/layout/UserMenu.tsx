import { ChevronDown, Store } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AccountProfile, Section } from "@/types";

/**
 * User switcher and quick actions menu displayed in the app header.
 */
export function UserMenu({
  activeUser,
  accounts,
  allowedSections,
  onSelectSettings,
  onSwitchUser,
  onLogout,
}: {
  activeUser: AccountProfile;
  accounts: AccountProfile[];
  allowedSections: Section[];
  onSelectSettings: () => void;
  onSwitchUser: (id: string) => void;
  onLogout: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <div className="relative inline-flex" ref={userMenuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="flex items-center gap-3 rounded-full border border-border/50 bg-card px-3 py-2 shadow"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Store className="h-4 w-4" />
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold">
            {activeUser.firstName} {activeUser.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{activeUser.role}</p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isOpen ? "rotate-180" : "",
          )}
        />
      </button>
      {isOpen ? (
        <div className="absolute left-0 top-full z-20 mt-3 w-72 rounded-2xl border border-border/60 bg-card/95 p-4 shadow-2xl backdrop-blur-md">
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              disabled={!allowedSections.includes("Settings")}
              onClick={() => {
                if (allowedSections.includes("Settings")) {
                  onSelectSettings();
                  setIsOpen(false);
                }
              }}
            >
              Settings
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
            >
              Log out
            </Button>
          </div>
          <div className="mt-4 border-t border-border/60 pt-3 text-xs uppercase tracking-wide text-muted-foreground">
            Users on this device
          </div>
          <ul className="mt-2 space-y-1">
            {accounts.map((account) => (
              <li key={account.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition",
                    account.id === activeUser.id
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-primary/10 hover:text-primary",
                  )}
                  disabled={account.id === activeUser.id}
                  onClick={() => {
                    onSwitchUser(account.id);
                    setIsOpen(false);
                  }}
                >
                  <span>
                    {account.firstName} {account.lastName}
                  </span>
                  <span className="text-xs uppercase text-muted-foreground">{account.role}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
