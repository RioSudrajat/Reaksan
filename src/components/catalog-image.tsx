import { cn } from "cn";

// Shared by server pages. The media route requires a session, so the img
// request carries the browser cookie like any other page fetch.
export function CatalogImage({
  mediaId,
  alt,
  size = 64,
  className,
  placeholderLabel = "Belum ada gambar",
}: {
  mediaId?: string | null;
  alt: string;
  size?: number;
  className?: string;
  placeholderLabel?: string;
}) {
  if (!mediaId) {
    return (
      <span
        role="img"
        aria-label={`${alt}: ${placeholderLabel}`}
        className={cn(
          "flex items-center justify-center rounded-xl border border-dashed border-[#D9D9D9] bg-[#FAFAFA] p-1 text-center text-[9px] font-medium leading-3 text-[#929292]",
          className,
        )}
        style={{ width: size, height: size }}
      >
        {placeholderLabel}
      </span>
    );
  }
  return (
    <img
      src={`/api/media/${mediaId}`}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className={cn(
        "rounded-xl border border-[#E1E1E1] bg-white object-cover",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
