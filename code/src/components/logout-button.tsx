"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button type="button" className="nav-logout-btn" onClick={() => signOut({ callbackUrl: "/" })}>
      Logout
    </button>
  );
}
