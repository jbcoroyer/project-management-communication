import Image from "next/image";

type IdenaLogoProps = {
  /** icon = pictogramme seul ; wordmark/full = picto + « idena » */
  variant?: "icon" | "wordmark" | "full";
  className?: string;
  "aria-hidden"?: boolean;
  "aria-label"?: string;
};

export default function IdenaLogo({
  variant = "icon",
  className,
  ...props
}: IdenaLogoProps) {
  const isIcon = variant === "icon";
  const src = isIcon ? "/idena-icon.png" : "/idena-logo.png";
  const width = isIcon ? 390 : 709;
  const height = isIcon ? 328 : 552;

  return (
    <Image
      src={src}
      alt={props["aria-hidden"] ? "" : props["aria-label"] ?? "IDENA"}
      width={width}
      height={height}
      priority
      className={["object-contain", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
