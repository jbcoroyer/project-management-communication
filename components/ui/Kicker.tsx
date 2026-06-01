import type { ReactNode } from "react";

export default function Kicker(props: { children: ReactNode; className?: string }) {
  return (
    <p className={["ui-kicker", props.className].filter(Boolean).join(" ")}>
      {props.children}
    </p>
  );
}
