import Link from "next/link";
import {
  ArrowRightIcon,
  ChatTextIcon,
  ClockCountdownIcon,
  EnvelopeSimpleIcon,
  LinkIcon,
  SealCheckIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react/ssr";
import { ChatDemo } from "@/components/chat-demo";
import { CopyAddress } from "@/components/copy-address";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const CHECKS = [
  { icon: LinkIcon, title: "Copycat website names", body: "Links like paypal-secure-login.com that borrow a company's name." },
  { icon: ClockCountdownIcon, title: "Website age", body: "Scam sites are often days old, or already taken down." },
  { icon: ArrowRightIcon, title: "Where short links lead", body: "We follow bit.ly and similar links to the real website." },
  { icon: EnvelopeSimpleIcon, title: "Who really sent it", body: "Does the sender's address belong to the company it names?" },
  { icon: SealCheckIcon, title: "Digital signature", body: "Real company email is signed. We check that the signature holds." },
  { icon: ChatTextIcon, title: "What it asks for", body: "Codes, card details, a fee, a rush. Quoted word for word." },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1160px] px-4">
        <section className="relative">
          <h1 className="mt-6 max-w-[11ch] font-display text-[clamp(52px,8.4vw,124px)] leading-[0.95] font-bold tracking-[-0.035em] text-ink md:mt-8">
            Ask before you tap.
          </h1>

          <div className="mt-8 grid grid-cols-1 gap-10 rounded-[22px] bg-band px-5 pt-8 pb-6 text-on-band md:mt-10 md:rounded-[28px] md:px-14 md:pt-14 md:pb-14 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_380px]">
            <div className="flex flex-col items-start">
              <p className="mb-7 max-w-[26em] text-lg leading-relaxed md:text-[21px]">
                Got a text about a parcel, a bank alert, a prize? Forward it to Second Look. You&rsquo;ll get a reply in
                seconds saying if it&rsquo;s a scam, and why, in plain words.
              </p>
              <CopyAddress />
              <Link
                href="/check"
                className="mt-5 inline-flex items-center gap-2 text-base font-bold text-on-band underline decoration-on-band/40 underline-offset-4 transition-[text-decoration-color] hover:decoration-on-band"
              >
                Or paste it here instead
                <ArrowRightIcon size={18} weight="bold" aria-hidden />
              </Link>
            </div>
            <div className="mx-auto w-full max-w-[400px] lg:-mt-[210px] xl:-mt-[250px]">
              <ChatDemo />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-8 py-16 md:gap-10 md:py-20 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <h2 className="mb-2 font-display text-[30px] leading-[1.1] font-bold text-accent md:text-[34px]">
              Works with what you already use.
            </h2>
            <p className="text-lg leading-relaxed text-ink-2">
              Forward the email, or send a screenshot of an SMS or WhatsApp message. Nothing to install.
            </p>
          </div>
          <div className="lg:pt-2">
            <h3 className="mb-2 font-display text-[26px] leading-[1.15] font-bold">Real checks first.</h3>
            <p className="text-lg leading-relaxed text-ink-2">Who owns each link, how old the website is, who really sent it.</p>
          </div>
          <div className="lg:pt-2">
            <h3 className="mb-2 font-display text-[26px] leading-[1.15] font-bold">No made-up reasons.</h3>
            <p className="text-lg leading-relaxed text-ink-2">Every warning points to a check, or to words in the message itself.</p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-10 border-t border-line py-16 md:gap-16 md:py-20 lg:grid-cols-[5fr_7fr]">
          <div>
            <h2 className="max-w-[14ch] font-display text-[36px] leading-[1.05] font-bold tracking-[-0.02em] md:text-[48px]">
              The AI writes the answer. The checks keep it honest.
            </h2>
            <p className="mt-5 max-w-[42ch] text-lg leading-relaxed text-ink-2">
              We look things up before the AI reads the message. It can only warn you about what a check found or what
              the message really says. Anything else gets dropped.
            </p>
            <p className="mt-6 flex items-start gap-3 rounded-2xl bg-accent-soft p-4 text-base leading-relaxed">
              <ShieldCheckIcon size={24} weight="duotone" className="mt-0.5 shrink-0 text-accent" aria-hidden />
              <span>
                <strong>Tip for email:</strong> choose &ldquo;Forward as attachment&rdquo;. It keeps the original
                signature, so we can tell a real bank email from a fake one.
              </span>
            </p>
          </div>
          <ul className="grid content-start gap-x-10 gap-y-8 sm:grid-cols-2">
            {CHECKS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="grid grid-cols-[28px_1fr] gap-x-3">
                <Icon size={26} weight="duotone" className="text-accent" aria-hidden />
                <div>
                  <h3 className="text-lg font-bold">{title}</h3>
                  <p className="mt-1 leading-relaxed text-ink-2">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
