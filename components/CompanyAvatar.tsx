"use client";

import { Building2 } from "lucide-react";

type CompanyAvatarProps = {
  name?: string | null;
  logoUrl?: string | null;
  className: string;
  fallbackClassName: string;
  iconClassName?: string;
};

export default function CompanyAvatar(props: CompanyAvatarProps) {
  const { name, logoUrl, className, fallbackClassName, iconClassName = "h-4 w-4" } = props;

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name ?? "Logo société"}
        className={className}
      />
    );
  }

  return (
    <div className={fallbackClassName}>
      <Building2 className={iconClassName} />
    </div>
  );
}
