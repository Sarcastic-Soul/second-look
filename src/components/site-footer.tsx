import { REPO_URL } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto grid w-full max-w-[1160px] grid-cols-1 gap-4 px-4 py-8 text-sm text-ink-2 md:grid-cols-[1fr_auto] md:items-end">
        <p className="max-w-[60ch] leading-relaxed">
          Second Look is an automated helper and can be wrong. If money or passwords are involved, check with the
          company directly, using a number or website you already trust.
        </p>
        <a href={REPO_URL} className="font-bold text-ink underline decoration-line underline-offset-4 hover:decoration-accent">
          Source code
        </a>
      </div>
    </footer>
  );
}
