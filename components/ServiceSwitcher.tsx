"use client";

import { Building2, ChevronDown } from "lucide-react";
import { useServicesOptional } from "../lib/servicesContext";
import { resolveOrgLabel } from "../lib/orgLabels";

export default function ServiceSwitcher() {
  const services = useServicesOptional();
  if (!services || services.loading) return null;

  const { myServices, activeServiceId, activeService, setActiveServiceId, orgLabels } =
    services;
  if (myServices.length === 0) return null;

  const serviceLabel = resolveOrgLabel(orgLabels, "service");
  const currentLabel = activeService?.name ?? `Tous mes ${serviceLabel.toLowerCase()}s`;

  return (
    <div className="relative">
      <label className="sr-only" htmlFor="service-switcher">
        {serviceLabel} actif
      </label>
      <div className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-[color:var(--foreground)]/40">
        <Building2 className="h-3.5 w-3.5" aria-hidden />
      </div>
      <select
        id="service-switcher"
        value={activeServiceId ?? "all"}
        onChange={(e) => {
          const v = e.target.value;
          setActiveServiceId(v === "all" ? null : v);
        }}
        className="ui-transition w-full appearance-none rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] py-2 pl-8 pr-8 text-[12px] font-medium text-[var(--foreground)] outline-none hover:border-[var(--accent)]/40 focus:border-[var(--accent)]"
        aria-label={`${serviceLabel} actif : ${currentLabel}`}
      >
        <option value="all">Tous mes {serviceLabel.toLowerCase()}s</option>
        {myServices.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--foreground)]/35"
        aria-hidden
      />
    </div>
  );
}
