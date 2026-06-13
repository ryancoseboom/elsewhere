"use client";

import type { MouseEvent, ReactNode } from "react";

export default function ArtifactBreadcrumbLink({
  children,
  className,
  href,
}: {
  children: ReactNode;
  className?: string;
  href: string;
}) {
  function openFresh(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    window.location.assign(href);
  }

  return (
    <a href={href} className={className} onClick={openFresh}>
      {children}
    </a>
  );
}
