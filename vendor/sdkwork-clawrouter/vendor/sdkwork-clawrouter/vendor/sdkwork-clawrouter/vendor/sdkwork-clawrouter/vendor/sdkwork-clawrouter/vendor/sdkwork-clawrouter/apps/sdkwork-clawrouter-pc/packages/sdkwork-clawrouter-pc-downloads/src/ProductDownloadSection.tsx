import { useEffect, useState } from "react";
import type {
  SdkworkDownloadPlatform,
  SdkworkProductDownloadSectionProps,
} from "./download-types";
import { SdkworkDownloadCardView } from "./DownloadCard";
import { detectSdkworkDownloadPlatform } from "./platform-detection";

function sectionClassName(
  className: string | undefined,
  variant: SdkworkProductDownloadSectionProps["variant"],
): string {
  const variantClass = variant === "hero"
    ? "w-full"
    : variant === "compact"
      ? "w-full"
      : "bg-white py-24 dark:bg-[#050505]";

  return [variantClass, className].filter(Boolean).join(" ");
}

function gridClassName(variant: SdkworkProductDownloadSectionProps["variant"]): string {
  if (variant === "compact") {
    return "grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3";
  }

  return "grid w-full grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3";
}

export function SdkworkProductDownloadSection({
  cards,
  className,
  catalog,
  detectedPlatform,
  onDownloadSelect,
  subtitle,
  title,
  variant = "section",
}: SdkworkProductDownloadSectionProps) {
  const downloadCards = cards ?? catalog?.cards ?? [];
  const [resolvedPlatform, setResolvedPlatform] = useState<SdkworkDownloadPlatform>(
    detectedPlatform ?? "generic",
  );

  useEffect(() => {
    if (!detectedPlatform) {
      setResolvedPlatform(detectSdkworkDownloadPlatform());
    }
  }, [detectedPlatform]);

  if (downloadCards.length === 0) {
    return null;
  }

  return (
    <section className={sectionClassName(className, variant)}>
      <div className={variant === "section" ? "mx-auto w-full max-w-7xl px-6 md:px-8 lg:px-12" : "w-full"}>
        {title || subtitle ? (
          <div className="mx-auto mb-16 max-w-3xl text-center">
            {title ? (
              <h2 className="mb-6 text-4xl font-bold text-slate-900 dark:text-white">
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="text-lg text-slate-600 dark:text-slate-400">
                {subtitle}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className={`${gridClassName(variant)} mx-auto ${variant === "compact" ? "" : "max-w-7xl"}`}>
          {downloadCards.map((card) => (
            <SdkworkDownloadCardView
              card={card}
              detectedPlatform={resolvedPlatform}
              key={card.id}
              onDownloadSelect={onDownloadSelect}
              variant={variant}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
