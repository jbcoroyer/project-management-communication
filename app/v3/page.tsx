import { redirect } from "next/navigation";

export default function V3IndexPage() {
  redirect("/v3/dashboard/kanban");
}
