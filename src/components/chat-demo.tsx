"use client";

import { motion, useReducedMotion } from "motion/react";

// The reply below is the real answer Second Look gave for this text, shortened to fit.
const bubble = "rounded-[18px] px-3.5 py-3 text-[15px] leading-snug";

export function ChatDemo() {
  const reduce = useReducedMotion();
  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          // Below the fold on phones and tablets, so play it when it scrolls into view.
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.3 },
          transition: { type: "spring" as const, bounce: 0, duration: 0.5, delay },
        };

  return (
    <div
      className="rounded-[36px] border-8 border-frame bg-paper px-3.5 pt-4 pb-5 text-ink shadow-[0_24px_40px_-28px_rgba(0,0,0,0.35)]"
      role="img"
      aria-label="Example: someone forwards a fake USPS text and Second Look replies that it is a scam, because the link is not a USPS website and the message tries to rush them."
    >
      <p className="mb-3.5 border-b border-line pb-3 text-center text-sm font-bold text-ink-2">Second Look</p>
      <div className="flex flex-col gap-3" aria-hidden>
        <motion.div {...enter(0.2)} className={`${bubble} ml-auto max-w-[88%] border border-line bg-surface`}>
          <span className="mb-1 block text-xs text-ink-2">You forwarded a screenshot</span>
          USPS: Your package could not be delivered. Update your details within 12 hours.
          usps-redelivery-track.info/us
        </motion.div>
        <motion.div {...enter(0.9)} className={`${bubble} max-w-[88%] bg-accent-soft`}>
          <span className="mb-1 block font-display text-[22px] leading-none font-bold text-scam">Scam</span>
          A fake delivery text after your card details.
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>usps-redelivery-track[.]info uses USPS&rsquo;s name but isn&rsquo;t a USPS website.</li>
            <li>&ldquo;Within 12 hours&rdquo; is there to rush you.</li>
          </ul>
        </motion.div>
        <motion.div {...enter(1.4)} className={`${bubble} max-w-[88%] bg-accent-soft`}>
          Don&rsquo;t tap the link. Expecting a parcel? Open the USPS app yourself.
        </motion.div>
      </div>
    </div>
  );
}
