import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { findLink } from "@/lib/family";
import { acceptAction, confirmOwnerAction, stopAction } from "../actions";

export const metadata: Metadata = {
  title: "Family alerts",
  robots: { index: false, follow: false },
};

// Email apps open links to scan them, so a visit never changes anything. Every change is a button press (a POST).

export default function FamilyTokenPage({ params }: PageProps<"/family/[token]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[760px] px-4 pt-4 pb-24 md:pt-10">
        <Suspense fallback={<div className="h-64 rounded-[22px] bg-accent-soft motion-safe:animate-pulse" />}>
          {params.then(({ token }) => <Manage token={token} />)}
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function Manage({ token }: { token: string }) {
  const found = await findLink(token);
  if (!found) notFound();
  const { link, role } = found;
  const owner = role === "owner";
  const other = owner ? link.contactName : link.ownerName;

  let title: string;
  let body: string;
  let primary: { action: (f: FormData) => Promise<void>; label: string } | null = null;
  let secondary: { label: string } | null = null;

  if (link.status === "stopped") {
    title = "Alerts are off.";
    body = owner
      ? `${link.contactName} won't get emails about messages you forward. You can set up a contact again at any time.`
      : `You won't get any more emails about ${link.ownerName}'s messages.`;
  } else if (link.status === "active") {
    title = "Alerts are on.";
    body = owner
      ? `If a message you forward is clearly a scam, we'll email ${link.contactName}.`
      : `If ${link.ownerName} forwards us a message that's clearly a scam, we'll email you.`;
    secondary = { label: "Stop alerts" };
  } else if (owner && link.status === "pending_owner") {
    title = "Confirm it was you.";
    body = `Press confirm and we'll ask ${link.contactName} if they're happy to get alerts about scam messages you forward.`;
    primary = { action: confirmOwnerAction, label: "Confirm" };
    secondary = { label: "Cancel" };
  } else if (owner) {
    title = `Waiting for ${link.contactName}.`;
    body = `We've emailed ${link.contactName}. Alerts start once they say yes.`;
    secondary = { label: "Cancel" };
  } else if (link.status === "pending_contact") {
    title = `Be ${link.ownerName}'s trusted contact?`;
    body = `When ${link.ownerName} forwards us a message that's clearly a scam, we'll send you a short email with what it said, so you can check in with them. Only clear scams, and you can stop at any time.`;
    primary = { action: acceptAction, label: "Yes, email me" };
    secondary = { label: "No thanks" };
  } else {
    // The contact's link before the owner confirmed: they shouldn't have it yet.
    title = "Nothing to do yet.";
    body = `${link.ownerName} hasn't confirmed this yet.`;
  }

  return (
    <section className="rounded-[22px] bg-surface p-6 ring-1 ring-line md:rounded-[28px] md:p-12">
      <p className="text-sm font-bold text-ink-2">Family alerts with {other}</p>
      <h1 className="mt-2 font-display text-[40px] leading-[1.05] font-bold tracking-[-0.025em] md:text-[56px]">{title}</h1>
      <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-ink-2">{body}</p>
      {(primary || secondary) && (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {primary && (
            <form action={primary.action}>
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="inline-flex items-center rounded-2xl bg-accent px-7 py-4 text-lg font-bold whitespace-nowrap text-on-accent transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]"
              >
                {primary.label}
              </button>
            </form>
          )}
          {secondary && (
            <form action={stopAction}>
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-2xl border border-line px-6 py-3.5 text-lg font-bold whitespace-nowrap text-ink transition-[border-color,transform] hover:border-scam hover:text-scam active:scale-[0.98]"
              >
                {secondary.label}
              </button>
            </form>
          )}
        </div>
      )}
      {link.status === "stopped" && owner && (
        <Link href="/family" className="mt-8 inline-block border-b-2 border-accent pb-0.5 text-lg font-bold hover:text-accent">
          Set up a contact
        </Link>
      )}
    </section>
  );
}
