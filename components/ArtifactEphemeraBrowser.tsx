"use client";

import {
  Children,
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ArtifactEphemeraPaneSummary = {
  count: number;
  id: string;
  label: string;
};

const ArtifactEphemeraContext = createContext(false);

export function ArtifactEphemeraBrowser({
  children,
  panes,
}: {
  children: ReactNode;
  panes: ArtifactEphemeraPaneSummary[];
}) {
  const [contactSheet, setContactSheet] = useState(false);

  return (
    <ArtifactEphemeraContext.Provider value={contactSheet}>
      <div id="ephemera-index" className="scroll-mt-24 border-y border-stone-800 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav aria-label="Ephemera sections" className="flex flex-wrap gap-x-5 gap-y-3">
            {panes.map((pane) => (
              <a
                key={pane.id}
                href={`#${pane.id}`}
                className="text-[10px] uppercase tracking-[0.2em] text-stone-300 transition hover:text-white"
              >
                {pane.label} <span className="text-stone-500">{pane.count}</span>
              </a>
            ))}
          </nav>
          <button
            type="button"
            aria-pressed={contactSheet}
            className="border border-stone-700 px-3 py-2 text-[9px] uppercase tracking-[0.2em] text-stone-300 transition hover:border-stone-400 hover:text-white"
            onClick={() => setContactSheet((current) => !current)}
          >
            {contactSheet ? "Expressive view" : "Contact sheet"}
          </button>
        </div>
      </div>
      <div className="mt-8 space-y-8">{children}</div>
    </ArtifactEphemeraContext.Provider>
  );
}

export function ArtifactEphemeraGroup({
  children,
  collapsible = true,
  count,
  id,
  label,
}: {
  children: ReactNode;
  collapsible?: boolean;
  count: number;
  id: string;
  label: string;
}) {
  const contactSheet = useContext(ArtifactEphemeraContext);
  const [expanded, setExpanded] = useState(false);
  const cards = Children.toArray(children);
  const canCollapse = collapsible && cards.length > 6;
  const visibleCards = canCollapse && !expanded ? cards.slice(0, 6) : cards;

  return (
    <section id={id} className="scroll-mt-24 border-t border-stone-800 pt-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[10px] uppercase tracking-[0.28em] text-stone-300">
          {label} <span className="text-stone-500">{count}</span>
        </h3>
        {canCollapse && (
          <button
            type="button"
            aria-expanded={expanded}
            className="text-[9px] uppercase tracking-[0.2em] text-stone-600 transition hover:text-stone-200"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "Show less" : `Reveal all ${cards.length}`}
          </button>
        )}
      </div>
      <div
        className={`grid gap-4 ${
          contactSheet
            ? "grid-cols-3 md:grid-cols-4 xl:grid-cols-6"
            : "sm:grid-cols-2 xl:grid-cols-3"
        }`}
      >
        {visibleCards}
      </div>
      {cards.length > 6 && (
        <a
          href="#ephemera-index"
          className="mt-5 inline-block text-[9px] uppercase tracking-[0.2em] text-stone-700 transition hover:text-stone-300"
        >
          Back to Ephemera index ↑
        </a>
      )}
    </section>
  );
}
