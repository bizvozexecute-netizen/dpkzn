"use client";

import { reachGoal, goals } from "@/lib/analytics";

interface TrackedLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  goal: keyof typeof goals;
  children: React.ReactNode;
}

/** Ссылка с отправкой цели Метрики по клику — для использования в серверных компонентах. */
export default function TrackedLink({ goal, children, ...props }: TrackedLinkProps) {
  return (
    <a {...props} onClick={() => reachGoal(goals[goal])}>
      {children}
    </a>
  );
}
