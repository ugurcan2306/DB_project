"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { signOut } from "next-auth/react";
import type { UserRole } from "@/types/user";

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type NavbarUser = {
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
};

export function AppNavbar({
  activePath,
  user,
}: {
  activePath: "discover" | "dashboard" | "supplier" | "challenges" | "profile" | "login" | "register" | "admin" | "create-recipe";
  user?: NavbarUser | null;
}) {
  return (
    <header className="navbar">
      <Link href="/" className="logo">
        <span>🍴</span> FarmToTable
      </Link>

      {!user ? (
        <nav>
          <Link href="/" className={activePath === "discover" ? "active" : ""}>
            Discover
          </Link>
          <Link href="/login" className={activePath === "login" ? "active" : ""}>
            Login
          </Link>
          <Link href="/register" className={activePath === "register" ? "active" : ""}>
            Register
          </Link>
        </nav>
      ) : (
        <nav className="navbar-auth-nav">
          <Link href="/" className={activePath === "discover" ? "active" : ""}>
            Discover
          </Link>
          <Link href="/dashboard" className={activePath === "dashboard" ? "active" : ""}>
            Dashboard
          </Link>
          {(user.role === "home_cook" || user.role === "verified_chef") ? (
            <Link href="/recipes/create" className={activePath === "create-recipe" ? "active" : ""}>
              Create Recipe
            </Link>
          ) : null}
          <Link href="/challenges" className={activePath === "challenges" ? "active" : ""}>
            Challenges
          </Link>
          {user.role === "local_supplier" ? (
            <Link href="/supplier" className={activePath === "supplier" ? "active" : ""}>
              Supplier Portal
            </Link>
          ) : null}
          {user.role === "admin" ? (
            <Link href="/admin" className={activePath === "admin" ? "active" : ""}>
              Admin
            </Link>
          ) : null}

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className={`nav-profile-link ${activePath === "profile" ? "active" : ""}`}
                aria-label="Open profile menu"
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt={`${user.name} profile`} className="nav-profile-avatar-img" />
                ) : (
                  <span className="nav-profile-avatar-fallback">{initialsFromName(user.name)}</span>
                )}
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content className="profile-dropdown" align="end" sideOffset={10}>
                <DropdownMenu.Item asChild>
                  <Link href="/profile" className={`profile-dropdown-item ${activePath === "profile" ? "active" : ""}`}>
                    Profile
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="profile-dropdown-separator" />
                <DropdownMenu.Item asChild>
                  <button type="button" className="profile-dropdown-item profile-dropdown-logout" onClick={() => signOut({ callbackUrl: "/" })}>
                    Logout
                  </button>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </nav>
      )}
    </header>
  );
}
