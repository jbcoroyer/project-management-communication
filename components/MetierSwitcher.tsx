"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, ChevronDown } from "lucide-react";
import { useServicesOptional } from "../lib/servicesContext";
import {
  isMetierSpaceSlug,
  METIER_SPACE_META,
  METIER_SPACE_SLUGS,
  type MetierSpaceSlug,
} from "../lib/metierSpaces";

/**
 * Switcher métier top bar : Communication / R&D / Gestion de Projet.
 * Pilote le service actif et redirige vers la home de l’espace.
 */
export default function MetierSwitcher() {
  const router = useRouter();
  const services = useServicesOptional();

  const options = useMemo(() => {
    if (!services) return [] as { slug: MetierSpaceSlug; id: string; name: string }[];
    const bySlug = new Map(services.myServices.map((s) => [s.slug, s]));
    // Admins voient tous les services ; sinon membership. Fallback : liste org si admin déjà filtré.
    const source =
      services.myServices.length > 0 ? services.myServices : services.services;
    const map = new Map(source.map((s) => [s.slug, s]));
    for (const [slug, s] of bySlug) map.set(slug, s);

    return METIER_SPACE_SLUGS.flatMap((slug) => {
      const svc = map.get(slug);
      if (!svc) return [];
      return [{ slug, id: svc.id, name: METIER_SPACE_META[slug].label }];
    });
  }, [services]);

  if (!services || services.loading || options.length === 0) return null;

  const activeSlug = services.activeService?.slug;
  const current =
    isMetierSpaceSlug(activeSlug) && options.some((o) => o.slug === activeSlug)
      ? activeSlug
      : options.find((o) => o.slug === "communication")?.slug ?? options[0]?.slug;

  const currentMeta = current ? METIER_SPACE_META[current] : null;

  return (
    <div className="relative shrink-0">
      <label className="sr-only" htmlFor="metier-switcher">
        Métier actif
      </label>
      <div className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-[color:var(--foreground)]/40">
        <Briefcase className="h-3.5 w-3.5" aria-hidden />
      </div>
      <select
        id="metier-switcher"
        value={current ?? ""}
        onChange={(e) => {
          const slug = e.target.value as MetierSpaceSlug;
          const opt = options.find((o) => o.slug === slug);
          if (!opt) return;
          services.setActiveServiceId(opt.id);
          router.push(METIER_SPACE_META[slug].homeHref);
        }}
        className="ui-transition h-9 appearance-none rounded-lg border border-[var(--line)] bg-[var(--surface)] py-0 pl-8 pr-8 text-[12px] font-medium text-[var(--foreground)] outline-none hover:border-[var(--accent)]/40 focus:border-[var(--accent)]"
        aria-label={`Métier actif : ${currentMeta?.label ?? ""}`}
        style={
          currentMeta
            ? { boxShadow: `inset 3px 0 0 ${currentMeta.color}` }
            : undefined
        }
      >
        {options.map((o) => (
          <option key={o.id} value={o.slug}>
            {o.name}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--foreground)]/35"
        aria-hidden
      />
    </div>
  );
}
