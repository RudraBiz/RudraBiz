import Link from "next/link";

export function TopNav() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
        <Link href="/companies" className="flex items-center gap-2">
          <span className="inline-block h-6 w-6 rounded bg-accent" />
          <span className="font-semibold tracking-tight">RudraBiz</span>
        </Link>
        <nav className="text-sm text-muted">
          <Link href="/companies" className="hover:text-ink">
            Companies
          </Link>
        </nav>
      </div>
    </header>
  );
}
