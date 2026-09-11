import { brand, footer, links, nav } from "@/lib/content";
import { Choco } from "./art/Choco";
import { Logo } from "./brand/Logo";

export function Footer() {
  return (
    <footer className="grain relative isolate overflow-hidden border-t border-ink-900/10 bg-cream-100 pb-8 pt-14">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_2fr] lg:gap-12">
          <div>
            <Logo variant="lockup" sizes="(max-width: 640px) 152px, 176px" className="h-16 sm:h-20" />
            <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-ink-500">
              {brand.tagline}
            </p>

            {/* in flow at the foot of the brand column — the page's sign-off,
                and nothing can end up underneath it */}
            <Choco
              pose="thumbsUp"
              float="bob"
              sizes="(max-width: 640px) 28vw, (max-width: 1024px) 16vw, 132px"
              className="mt-6 w-[26%] max-w-[92px] sm:w-[14%] lg:mt-8 lg:w-[30%] lg:max-w-[116px]"
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
              <p className="text-sm text-ink-500">Open from 7 PM to 11 PM</p>
              <p className="mt-2 text-sm text-ink-500">Every day of the week</p>
              <p className="mt-4 text-xs text-muted">
                Follow us for daily dessert updates
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-ink-900/10 pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between lg:mt-14">
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
