import type { ImageProps } from "next/image";
import Image from "next/image";

import { resolveStoreMediaUrl } from "@/lib/constants";

type StoreImageProps = Omit<ImageProps, "src"> & {
  src: string | null | undefined;
};

/** Renders local store assets under the /waydoo basePath. */
export function StoreImage({ src, alt = "", priority, ...props }: StoreImageProps) {
  const resolved = resolveStoreMediaUrl(src);
  if (!resolved) return null;
  return (
    <Image
      src={resolved}
      alt={alt}
      unoptimized
      loading={priority ? undefined : "lazy"}
      priority={priority}
      {...props}
    />
  );
}
