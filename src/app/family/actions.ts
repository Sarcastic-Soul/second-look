"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { acceptContact, confirmOwner, SignupError, startSignup, stopLink } from "@/lib/family";

/** On error the typed values come back, because React clears the form after an action runs. */
export type SignupState = { ok: false; error?: string; values?: Record<string, string> } | { ok: true };

export async function signUp(_prev: SignupState, form: FormData): Promise<SignupState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const field = (name: string) => String(form.get(name) ?? "");
  const values = Object.fromEntries(["ownerName", "ownerEmail", "contactName", "contactEmail"].map((k) => [k, field(k)]));
  try {
    await startSignup({
      ownerName: field("ownerName"),
      ownerEmail: field("ownerEmail"),
      contactName: field("contactName"),
      contactEmail: field("contactEmail"),
      consent: form.get("consent") === "on",
      ip,
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof SignupError) return { ok: false, error: e.message, values };
    console.error(`[family] sign-up failed: ${(e as Error).message}`);
    return { ok: false, error: "Something went wrong on our side. Please try again in a minute.", values };
  }
}

// The token in the form is the only proof of who is asking, the same as the link in their email.
// Each action changes state only from the step it expects, so replaying one does nothing.

function tokenFrom(form: FormData): string {
  return String(form.get("token") ?? "");
}

export async function confirmOwnerAction(form: FormData) {
  const token = tokenFrom(form);
  await confirmOwner(token);
  redirect(`/family/${token}`);
}

export async function acceptAction(form: FormData) {
  const token = tokenFrom(form);
  await acceptContact(token);
  redirect(`/family/${token}`);
}

export async function stopAction(form: FormData) {
  const token = tokenFrom(form);
  await stopLink(token);
  redirect(`/family/${token}`);
}
