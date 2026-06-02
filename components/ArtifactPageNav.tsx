"use client";

import { useEffect, useState } from "react";

type ArtifactPageNavItem = {
  href: string;
  label: string;
};

export default function ArtifactPageNav({
  items,
  summary,
  title,
}: {
  items: ArtifactPageNavItem[];
  summary: string[];
  title: string;
}) {
  const [activeHref, setActiveHref] = useState(items[0]?.href || "");
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const sections = items
      .map((item) => document.querySelector(item.href))
      .filter((section): section is Element => Boolean(section));

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visibleEntry) setActiveHref(`#${visibleEntry.target.id}`);
      },
      { rootMargin: "-18% 0px -68% 0px", threshold: [0, 0.2, 0.8] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    function updateBackToTop() {
      setShowBackToTop(window.scrollY > 720);
    }

    updateBackToTop();
    window.addEventListener("scroll", updateBackToTop, { passive: true });
    return () => window.removeEventListener("scroll", updateBackToTop);
  }, []);

  return (
    <>
      <nav
        aria-label={`${title} sections`}
        className="sticky top-0 z-40 -mx-5 mt-7 border-y border-stone-800/90 bg-[#11100e]/95 px-5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2">
          <p className="mr-auto font-serif text-sm text-stone-300">{title}</p>
          <p className="w-full text-[9px] uppercase tracking-[0.2em] text-stone-600 md:order-last md:w-auto">
            {summary.join(" · ")}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`text-[9px] uppercase tracking-[0.2em] transition ${
                  activeHref === item.href
                    ? "text-stone-100"
                    : "text-stone-600 hover:text-stone-300"
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {showBackToTop && (
        <a
          href="#artifact-top"
          className="fixed bottom-5 right-5 z-40 border border-stone-700 bg-black/80 px-3 py-2 text-[9px] uppercase tracking-[0.2em] text-stone-400 shadow-xl backdrop-blur transition hover:border-stone-400 hover:text-white"
        >
          Back to top ↑
        </a>
      )}
    </>
  );
}
