import { redirect } from "next/navigation";

/** Wipe UX Events → nouvel espace Salons. */
export default function V3EventsRedirect() {
  redirect("/v3/salons");
}
