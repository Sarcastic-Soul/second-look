"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FileTextIcon, ImageSquareIcon, PaperclipIcon, WarningIcon, XIcon } from "@phosphor-icons/react";
import { SAMPLES } from "@/lib/samples";

const ACCEPT = "image/png,image/jpeg,image/webp,image/heic,.eml,message/rfc822";
const MAX_FILES = 3;
const MAX_BYTES = 5 * 1024 * 1024;

type Status = { kind: "idle" } | { kind: "checking" } | { kind: "error"; message: string };

function isEml(f: File) {
  return f.name.toLowerCase().endsWith(".eml") || f.type === "message/rfc822";
}

export function Checker() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const fileInput = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const checking = status.kind === "checking";

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files, ...Array.from(list)];
    const tooBig = next.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      setStatus({ kind: "error", message: `${tooBig.name} is bigger than 5 MB.` });
      return;
    }
    // A saved email is checked on its own, so keep just that one if it's there.
    const eml = next.find(isEml);
    setFiles(eml ? [eml] : next.slice(0, MAX_FILES));
    setStatus({ kind: "idle" });
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() && files.length === 0) {
      setStatus({ kind: "error", message: "Paste the message or add a screenshot first." });
      return;
    }
    setStatus({ kind: "checking" });
    const form = new FormData();
    form.set("text", text);
    for (const f of files) form.append("files", f);
    try {
      const res = await fetch("/api/check", { method: "POST", body: form });
      const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !body.id) {
        setStatus({ kind: "error", message: body.error ?? "Something went wrong while checking this message. Please try again." });
        return;
      }
      router.push(`/r/${body.id}`);
    } catch {
      setStatus({ kind: "error", message: "We couldn't reach Second Look. Check your connection and try again." });
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" aria-busy={checking}>
      <div className="flex flex-col gap-2">
        <label htmlFor="message" className="text-lg font-bold">
          Paste the message
        </label>
        <textarea
          id="message"
          name="text"
          rows={9}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={checking}
          aria-describedby="message-help"
          placeholder={"From: +1 (844) 902-3317\n\nYour package could not be delivered..."}
          className="w-full resize-y rounded-2xl border border-line bg-surface px-4 py-3.5 text-base leading-relaxed text-ink placeholder:text-ink-2/70 focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        />
        <p id="message-help" className="text-sm text-ink-2">
          Include the sender&rsquo;s name, number or email address if you can see it.
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-ink-2">
          <span>No message to hand? Try:</span>
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              type="button"
              disabled={checking}
              onClick={() => {
                setText(s.text);
                setFiles([]);
                setStatus({ kind: "idle" });
              }}
              className="min-h-11 rounded-full border border-line px-4 py-2 font-bold text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span id="files-label" className="text-lg font-bold">
          Or add screenshots
        </span>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`rounded-2xl border border-dashed p-4 transition-colors ${dragging ? "border-accent bg-accent-soft" : "border-line bg-surface/60"}`}
        >
          <input
            ref={fileInput}
            id="files"
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            aria-labelledby="files-label"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
            disabled={checking}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={checking}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-paper px-4 py-2.5 text-base font-bold text-ink transition-[border-color,transform] hover:border-accent active:scale-[0.98] disabled:opacity-60"
            >
              <PaperclipIcon size={18} weight="bold" aria-hidden />
              Choose files
            </button>
            <span className="text-sm text-ink-2">Up to 3 screenshots, or one saved email (.eml). 5 MB each.</span>
          </div>
          {files.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="inline-flex items-center gap-2 rounded-xl bg-accent-soft py-1.5 pr-1.5 pl-3 text-sm font-bold">
                  {isEml(f) ? <FileTextIcon size={16} aria-hidden /> : <ImageSquareIcon size={16} aria-hidden />}
                  <span className="max-w-[22ch] truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles(files.filter((_, j) => j !== i))}
                    disabled={checking}
                    className="-my-1 rounded-lg p-2.5 text-ink-2 hover:bg-paper hover:text-ink"
                    aria-label={`Remove ${f.name}`}
                  >
                    <XIcon size={14} weight="bold" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={checking}
          className="inline-flex items-center justify-center rounded-2xl bg-accent px-7 py-4 text-lg font-bold whitespace-nowrap text-on-accent transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:opacity-70"
        >
          {checking ? "Checking..." : "Check it"}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {status.kind === "error" && (
          <motion.p
            key="error"
            role="alert"
            initial={reduce ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="flex items-start gap-2 rounded-2xl bg-scam-soft px-4 py-3 text-base font-bold text-scam"
          >
            <WarningIcon size={20} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
            {status.message}
          </motion.p>
        )}
        {checking && (
          <motion.div
            key="checking"
            role="status"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="rounded-2xl border border-line bg-surface p-5"
          >
            <p className="font-bold">Checking the links, the website and the sender.</p>
            <p className="mt-1 text-sm text-ink-2">This usually takes 5 to 15 seconds.</p>
            <div className="mt-5 space-y-3 motion-safe:animate-pulse" aria-hidden>
              <div className="h-7 w-28 rounded-lg bg-accent-soft" />
              <div className="h-4 w-4/5 rounded bg-line" />
              <div className="h-4 w-3/5 rounded bg-line" />
              <div className="h-4 w-2/3 rounded bg-line" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
