import Image from "next/image";

import { brand } from "@/lib/content";
import { logos, type LogoVariant } from "@/lib/brand-images";

/**
 * The Paris Bites logo.
 *
 * Sized by height, because that is what a logo has to line up with — a nav
 * bar, a column of copy — while the width follows the artwork. The image
 * itself is `w-auto h-full` inside a fixed-height box, so the aspect ratio
 * survives every breakpoint.
 *
 * `wordmark` drops the "Chocolaterie & Desserts" line: below ~40px tall it
 * sets at about 4px and turns to mush. Use `lockup` where there is room.
 */
export function Logo({
  variant = "wordmark",
  sizes,
  className = "",
  priority = false,
}: {
  variant?: LogoVariant;
  /** responsive hint; the image renders fluid to its container's height */
  sizes: string;
  /** set the height here — h-9, h-14, and so on */
  className?: string;
  /** set above the fold so the logo doesn't pop in late */
  priority?: boolean;
}) {
  return (
    <span className={`block ${className}`}>
      <Image
        src={logos[variant]}
        alt={`${brand.name} — ${brand.descriptor}`}
        sizes={sizes}
        priority={priority}
        draggable={false}
        className="h-full w-auto select-none object-contain object-left"
      />
    </span>
  );
}
