import type { Metadata } from "next";
import { Checker } from "@/components/checker";
import { CopyAddress } from "@/components/copy-address";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Check a message",
  description: "Paste a suspicious message or add a screenshot, and find out if it's a scam.",
};

export default function CheckPage() {
  return (
    <>
      <SiteHeader showCheckLink={false} />
      <main className="mx-auto grid w-full max-w-[1160px] grid-cols-1 gap-10 px-4 pt-4 pb-20 md:pt-8 lg:grid-cols-[7fr_4fr] lg:gap-14">
        <div>
          <h1 className="font-display text-[44px] leading-[1] font-bold tracking-[-0.03em] md:text-[64px]">
            Check a message.
          </h1>
          <p className="mt-4 mb-10 max-w-[40ch] text-lg leading-relaxed text-ink-2">
            Paste it, or add a screenshot. Nothing is sent to whoever wrote it.
          </p>
          <Checker />
        </div>

        <aside className="flex flex-col gap-6 lg:pt-[148px]">
          <div className="rounded-[22px] bg-band p-6 text-on-band">
            <h2 className="font-display text-2xl font-bold">On your phone?</h2>
            <p className="mt-2 mb-5 leading-relaxed">
              Forward the email, or send a screenshot, to this address. The answer comes back as a reply.
            </p>
            <CopyAddress />
          </div>
          <div className="px-1 text-base leading-relaxed text-ink-2">
            <h2 className="mb-1 font-bold text-ink">What we keep</h2>
            <p>
              We save the message and the result so your report link keeps working. Please don&rsquo;t paste passwords
              or one-time codes.
            </p>
          </div>
        </aside>
      </main>
      <SiteFooter />
    </>
  );
}
