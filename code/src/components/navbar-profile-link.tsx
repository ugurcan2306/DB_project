import Link from "next/link";

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function NavbarProfileLink({
  name,
  avatarUrl,
  active = false,
}: {
  name: string;
  avatarUrl?: string | null;
  active?: boolean;
}) {
  return (
    <Link href="/profile" className={`nav-profile-link ${active ? "active" : ""}`} aria-label="Profile">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={`${name} profile`} className="nav-profile-avatar-img" />
      ) : (
        <span className="nav-profile-avatar-fallback">{initialsFromName(name)}</span>
      )}
    </Link>
  );
}
