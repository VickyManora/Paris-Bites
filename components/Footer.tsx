import { brand, footer, links, nav } from "@/lib/content";
import { Choco } from "./art/Choco";
import { Logo } from "./brand/Logo";

export function Footer() {
  return (
    <footer className="grain relative isolate overflow-hidden border-t border-ink-900/10 bg-cream-100 pt-16 pb-10">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Logo variant="lockup" sizes="(max-width: 640px) 152px, 176px" className="h-24 sm:h-28" />
            <p className="mt-5 max-w-[34ch] text-sm leading-relaxed text-ink-500">
              {brand.tagline}
            </p>

            {/* in flow at the foot of the brand column — the page's sign-off,
                and nothing can end up underneath it */}
            <Choco
              pose="thumbsUp"
              float="bob"
              sizes="(max-width: 640px) 28vw, (max-width: 1024px) 16vw, 132px"
              className="mt-8 w-[28%] max-w-[104px] sm:w-[16%] lg:mt-10 lg:w-[34%] lg:max-w-[132px]"
            />
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <p className="kicker mb-4">Explore</p>
              <ul className="space-y-1 lg:space-y-3">
                {nav.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="-my-1 inline-block py-3 text-sm text-ink-500 transition-colors hover:text-ink-900 lg:my-0 lg:py-0"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="kicker mb-4">Get in touch</p>
              <ul className="space-y-1 lg:space-y-3">
                <li>
                  <a
                    href={links.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="-my-1 inline-block py-3 text-sm text-ink-500 transition-colors hover:text-ink-900 lg:my-0 lg:py-0"
                  >
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a
                    href={links.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="-my-1 inline-block py-3 text-sm text-ink-500 transition-colors hover:text-ink-900 lg:my-0 lg:py-0"
                  >
                    Instagram
                  </a>
                </li>
                <li>
                  <a
                    href={links.maps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="-my-1 inline-block py-3 text-sm text-ink-500 transition-colors hover:text-ink-900 lg:my-0 lg:py-0"
                  >
                    Find the cart
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="kicker mb-4">Opening hours</p>
              <p className="text-sm text-ink-500">Open from 5 PM onwards</p>
              <p className="mt-2 text-sm text-ink-500">Every day of the week</p>
              <p className="mt-4 text-xs text-muted">
                Follow us for daily dessert updates
              </p>
            </div>
          </div>
        </div>

        <div
          aria-hidden
          className="display pointer-events-none mt-16 -mb-[0.1em] select-none overflow-hidden text-center text-[clamp(3rem,13vw,11rem)] italic leading-none text-gold-500/[0.13]"
        >
          {brand.name}
        </div>

        <div className="flex flex-col gap-3 border-t border-ink-900/10 pt-7 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{footer.compliance}</p>
          <p>
            © {new Date().getFullYear()} {brand.name} — {brand.descriptor} ·{" "}
            {footer.credit}
          </p>
        </div>
      </div>
    </footer>
  );
}
