import Image from "next/image";

import { bowlPhoto } from "@/lib/bowl-images";
import { Bowl } from "./Bowl";

type Tone = "dark" | "berry" | "caramel" | "cream";

/**
 * A bowl, photographed if we have a shot of it and drawn if we don't.
 *
 * `id` is the bowl id from content.ts — it's what the photo is looked up by.
 * The SVG-only flourishes (`spoon`, `pour`) are ignored once a photo exists,
 * since the photo carries its own garnish.
 */
export function BowlArt({
  id,
  tone,
  label,
  width,
  className = "",
  sizes,
  priority = false,
  spoon = false,
  pour = false,
}: {
  id: string;
  tone: Tone;
  label: string;
  width: number;
  className?: string;
  /** responsive hint for next/image; the photo is rendered fluid, not at `width` */
  sizes?: string;
  priority?: boolean;
  spoon?: boolean;
  pour?: boolean;
}) {
  const photo = bowlPhoto(id);

  if (!photo) {
    return (
      <Bowl tone={tone} id={id} label={label} width={width} className={className} spoon={spoon} pour={pour} />
    );
  }

  return (
    <Image
      src={photo}
      alt={label}
      sizes={sizes ?? `${width}px`}
      placeholder="blur"
      priority={priority}
      className={className}
      style={{ height: "auto" }}
    />
  );
}
