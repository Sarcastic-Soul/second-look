"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { INBOX_ADDRESS } from "@/lib/site";

/** The forwarding address, with a button that copies it. Copy is the whole point on a phone. */
export function CopyAddress() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(INBOX_ADDRESS);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the address is still selectable text.
    }
  }

  return (
    <div className="inline-flex max-w-full items-center gap-1 rounded-2xl bg-paper p-1.5 pl-4 text-ink">
      <span className="truncate text-base font-bold select-all md:text-lg">{INBOX_ADDRESS}</span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold text-accent transition-[background-color,transform] hover:bg-accent-soft active:scale-[0.98]"
        aria-label={copied ? "Address copied" : "Copy address"}
      >
        {copied ? <CheckIcon size={18} weight="bold" /> : <CopyIcon size={18} weight="bold" />}
        <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
}
