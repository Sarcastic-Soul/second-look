import type { Metadata } from "next";
import { FamilyForm } from "@/components/family-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Family alerts",
  description: "Let someone you trust know when a message you forward to Second Look is a scam.",
};

const STEPS = [
  { title: "You confirm", body: "We email you a link, so nobody can sign you up without asking." },
  { title: "They say yes", body: "Then we ask your contact. Nothing reaches them until they agree." },
  { title: "Only clear scams", body: "They hear from us when a message you forward is a scam we're sure about. Not for the rest." },
];

export default function FamilyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-[1160px] grid-cols-1 gap-12 px-4 pt-4 pb-20 md:pt-8 lg:grid-cols-[7fr_4fr] lg:gap-14">
        <div>
          <h1 className="max-w-[14ch] font-display text-[44px] leading-[1] font-bold tracking-[-0.03em] md:text-[64px]">
            Keep someone in the loop.
          </h1>
          <p className="mt-4 mb-10 max-w-[44ch] text-lg leading-relaxed text-ink-2">
            Pick one person you trust, like a son, daughter or friend. If a message you forward to us is a scam, they get a
            short email so they can check in with you.
          </p>
          <FamilyForm />
        </div>

        <aside className="lg:pt-[164px]">
          <ol className="flex flex-col gap-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[36px_1fr] gap-x-3">
                <span className="font-display text-[28px] leading-none font-bold text-accent">{i + 1}</span>
                <div>
                  <h2 className="text-lg font-bold">{s.title}</h2>
                  <p className="mt-1 leading-relaxed text-ink-2">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-8 rounded-2xl bg-accent-soft p-4 leading-relaxed">
            Either of you can stop the alerts at any time with the link in our emails.
          </p>
        </aside>
      </main>
      <SiteFooter />
    </>
  );
}
