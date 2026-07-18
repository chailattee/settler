"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession, signOut, connectGmail } from "@/lib/auth-client";

const navLinks = [
  { href: "/scan", label: "Scan" },
  { href: "/matches", label: "Matches" },
  { href: "/claims", label: "Claims" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  pathname.startsWith(link.href)
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isPending ? (
            <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
          ) : session ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {session.user.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut()}
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => connectGmail()}>
              Connect Gmail
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
