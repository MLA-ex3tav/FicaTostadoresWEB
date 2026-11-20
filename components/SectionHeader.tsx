import type { ReactNode } from "react";

export const sectionEyebrowClass = "text-sm font-medium text-steel-dark";

export const sectionTitleClass =
  "text-3xl font-medium tracking-tight text-steel-light md:text-4xl";

export const sectionDescriptionClass =
  "mt-4 text-base leading-relaxed text-steel-mid";

interface SectionHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  as?: "h1" | "h2";
  align?: "left" | "center";
  className?: string;
}

export default function SectionHeader({
  eyebrow,
  title,
  description,
  as: Heading = "h2",
  align = "left",
  className = "",
}: SectionHeaderProps) {
  const wrapperClass =
    align === "center"
      ? `mx-auto max-w-2xl text-center ${className}`.trim()
      : `max-w-xl ${className}`.trim();

  return (
    <div className={wrapperClass}>
      {eyebrow ? (
        <p className={sectionEyebrowClass}>{eyebrow}</p>
      ) : null}
      <Heading className={`mt-2 ${sectionTitleClass}`}>{title}</Heading>
      {description ? (
        <p className={sectionDescriptionClass}>{description}</p>
      ) : null}
    </div>
  );
}
