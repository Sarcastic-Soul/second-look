"use client";

import { useActionState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EnvelopeSimpleOpenIcon, WarningIcon } from "@phosphor-icons/react";
import { signUp, type SignupState } from "@/app/family/actions";

const input =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";

function Field({ id, label, help, type = "text", autoComplete, disabled, values }: {
  id: string;
  values?: Record<string, string>;
  label: string;
  help?: string;
  type?: string;
  autoComplete?: string;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      <input id={id} name={id} type={type} defaultValue={values?.[id]} required autoComplete={autoComplete} disabled={disabled} aria-describedby={help ? `${id}-help` : undefined} className={input} />
      {help && (
        <p id={`${id}-help`} className="text-sm text-ink-2">
          {help}
        </p>
      )}
    </div>
  );
}

export function FamilyForm() {
  const reduce = useReducedMotion();
  const [state, action, pending] = useActionState<SignupState, FormData>(signUp, { ok: false });

  if (state.ok) {
    return (
      <motion.div
        role="status"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        className="rounded-[22px] bg-accent-soft p-6 md:p-8"
      >
        <EnvelopeSimpleOpenIcon size={32} weight="duotone" className="text-accent" aria-hidden />
        <h2 className="mt-3 font-display text-[28px] leading-tight font-bold">Check your email.</h2>
        <p className="mt-2 max-w-[46ch] text-lg leading-relaxed text-ink-2">
          We sent you a link to confirm. After that we&rsquo;ll ask your contact to say yes. If it&rsquo;s not there in a
          minute, look in spam.
        </p>
      </motion.div>
    );
  }

  const values = state.values;
  return (
    <form action={action} className="flex flex-col gap-8" aria-busy={pending}>
      <fieldset className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <legend className="mb-4 font-display text-2xl font-bold">You</legend>
        <Field id="ownerName" label="Your name" help="As your family would know you." autoComplete="name" disabled={pending} values={values} />
        <Field id="ownerEmail" label="Your email" help="The address you forward messages from." type="email" autoComplete="email" disabled={pending} values={values} />
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <legend className="mb-4 font-display text-2xl font-bold">Your trusted contact</legend>
        <Field id="contactName" label="Their name" disabled={pending} values={values} />
        <Field id="contactEmail" label="Their email" type="email" disabled={pending} values={values} />
      </fieldset>

      <label className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 leading-relaxed">
        <input type="checkbox" name="consent" required disabled={pending} className="mt-1 size-5 shrink-0 accent-accent" />
        <span>
          I&rsquo;ve asked them, and they&rsquo;re happy to get an email when a message I forward is clearly a scam. The
          email links to the report, which includes the message.
        </span>
      </label>

      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-scam-soft px-4 py-3 text-base font-bold text-scam">
          <WarningIcon size={20} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-2xl bg-accent px-7 py-4 text-lg font-bold whitespace-nowrap text-on-accent transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:opacity-70"
        >
          {pending ? "Sending..." : "Send me a confirmation"}
        </button>
      </div>
    </form>
  );
}
