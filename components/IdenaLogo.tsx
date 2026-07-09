import type { SVGProps } from "react";

type IdenaLogoProps = SVGProps<SVGSVGElement> & {
  /** icon = pictogramme seul ; wordmark = picto + « idena » ; full = avec baseline */
  variant?: "icon" | "wordmark" | "full";
  /** Sous-titre custom (remplace la baseline IDENA par défaut) */
  subtitle?: string;
};

const ICON = (
  <>
    <defs>
      <linearGradient id="idena-blue-grad" x1="44" y1="4" x2="44" y2="84" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#B8E4F9" />
        <stop offset="0.45" stopColor="#5DBCEB" />
        <stop offset="1" stopColor="#1E9FD4" />
      </linearGradient>
    </defs>
    <rect width="88" height="88" rx="17" fill="url(#idena-blue-grad)" />
    <path
      d="M30 88H88V54.5C88 54.5 70.5 70 46.5 79.5C38.5 82.5 30 88 30 88Z"
      fill="#B5D434"
    />
    <path
      d="M20.5 71.5C20.5 71.5 34 40.5 53.5 27.5C59.5 23.5 65.5 21.5 69 23.5C69 23.5 58.5 38.5 50.5 53C42.5 67.5 38.5 77 23 80.5C23 80.5 17 78.5 20.5 71.5Z"
      fill="#FFFFFF"
    />
    <circle cx="57" cy="29.5" r="8.8" fill="#FFFFFF" />
  </>
);

export default function IdenaLogo({
  variant = "icon",
  subtitle,
  className,
  ...props
}: IdenaLogoProps) {
  if (variant === "icon") {
    return (
      <svg
        viewBox="0 0 88 88"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="IDENA"
        className={className}
        {...props}
      >
        {ICON}
      </svg>
    );
  }

  const showBaseline = variant === "full";
  const baseline =
    subtitle ??
    (variant === "full" ? "LA NUTRITION ANIMALE INNOVANTE PAR NATURE" : undefined);

  return (
    <svg
      viewBox="0 0 200 248"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="IDENA"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="idena-blue-grad-wm" x1="100" y1="18" x2="100" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#B8E4F9" />
          <stop offset="0.45" stopColor="#5DBCEB" />
          <stop offset="1" stopColor="#1E9FD4" />
        </linearGradient>
      </defs>
      <g transform="translate(56 8)">
        <rect width="88" height="88" rx="17" fill="url(#idena-blue-grad-wm)" />
        <path
          d="M30 88H88V54.5C88 54.5 70.5 70 46.5 79.5C38.5 82.5 30 88 30 88Z"
          fill="#B5D434"
        />
        <path
          d="M20.5 71.5C20.5 71.5 34 40.5 53.5 27.5C59.5 23.5 65.5 21.5 69 23.5C69 23.5 58.5 38.5 50.5 53C42.5 67.5 38.5 77 23 80.5C23 80.5 17 78.5 20.5 71.5Z"
          fill="#FFFFFF"
        />
        <circle cx="57" cy="29.5" r="8.8" fill="#FFFFFF" />
      </g>
      <text
        x="100"
        y="138"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="var(--font-sans), system-ui, sans-serif"
        fontSize="42"
        fontWeight="800"
        letterSpacing="-0.5"
      >
        idena
      </text>
      {showBaseline && baseline ? (
        <text
          x="100"
          y="168"
          textAnchor="middle"
          fill="currentColor"
          opacity="0.55"
          fontFamily="var(--font-sans), system-ui, sans-serif"
          fontSize="9.5"
          fontWeight="600"
          letterSpacing="0.12em"
        >
          {baseline.toUpperCase()}
        </text>
      ) : null}
    </svg>
  );
}
