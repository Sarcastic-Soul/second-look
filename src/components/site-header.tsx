import Link from "next/link";

export function SiteHeader({ showCheckLink = true }: { showCheckLink?: boolean }) {
  return (
    <header className="mx-auto flex w-full max-w-[1160px] items-center justify-between px-4 py-6 md:py-7">
      <Link href="/" className="font-display text-2xl font-bold tracking-tight text-accent">
        Second Look
      </Link>
      {showCheckLink && (
        <Link
          href="/check"
          className="-my-2 border-b-2 border-accent py-2 pb-0.5 text-base font-bold text-ink transition-colors hover:text-accent"
        >
          Check a message
        </Link>
      )}
    </header>
  );
}
