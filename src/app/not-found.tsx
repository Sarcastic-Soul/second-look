import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1160px] px-4 pt-8 pb-24">
        <h1 className="font-display text-[44px] leading-none font-bold tracking-[-0.03em] md:text-[64px]">Nothing here.</h1>
        <p className="mt-4 max-w-[44ch] text-lg leading-relaxed text-ink-2">
          This page doesn&rsquo;t exist, or the report link is wrong. Report links only work once the check has finished.
        </p>
        <Link href="/check" className="mt-8 inline-block border-b-2 border-accent pb-0.5 text-lg font-bold hover:text-accent">
          Check a message
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
