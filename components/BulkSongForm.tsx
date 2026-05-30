"use client";

import { useState } from "react";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type Props = {
  action: (formData: FormData) => void;
};

export default function BulkSongForm({ action }: Props) {
  const [rows, setRows] = useState(
    Array.from({ length: 10 }, (_, index) => ({
      id: index,
      title: "",
      slug: "",
      slugTouched: false,
    }))
  );

  function updateTitle(id: number, title: string) {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              title,
              slug: row.slugTouched ? row.slug : slugify(title),
            }
          : row
      )
    );
  }

  function updateSlug(id: number, slug: string) {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              slug: slugify(slug),
              slugTouched: true,
            }
          : row
      )
    );
  }

  function addRows() {
    setRows((current) => [
      ...current,
      ...Array.from({ length: 5 }, (_, index) => ({
        id: current.length + index,
        title: "",
        slug: "",
        slugTouched: false,
      })),
    ]);
  }

  return (
    <div className="space-y-8">
      <div className="border border-stone-800 bg-stone-950/60">
        <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_auto] gap-4 border-b border-stone-800 px-4 py-3 text-[10px] uppercase tracking-[0.25em] text-stone-600">
          <div>Song</div>
          <div>Slug</div>
          <div>Audio</div>
          <div>Image</div>
          <div></div>
        </div>

        <div>
          {rows.map((row) => (
            <form
              key={row.id}
              action={action}
              className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_auto] gap-4 border-b border-stone-900 px-4 py-4 items-center"
            >
              <input type="hidden" name="kind" value="Song" />

              <input
                name="title"
                value={row.title}
                onChange={(event) => updateTitle(row.id, event.target.value)}
                className="w-full bg-transparent border-b border-stone-800 px-1 py-2 text-stone-100 outline-none focus:border-stone-400"
                placeholder="A Visitor's View"
                required
              />

              <input
                name="slug"
                value={row.slug}
                onChange={(event) => updateSlug(row.id, event.target.value)}
                className="w-full bg-transparent border-b border-stone-800 px-1 py-2 text-stone-300 outline-none focus:border-stone-400"
                placeholder="a-visitors-view"
                required
              />

              <div>
  <label className="block mb-2 text-[10px] uppercase tracking-[0.25em] text-stone-600">
    Audio
  </label>

  <input
    name="audio_file"
    type="file"
    accept="audio/*"
    className="w-full text-xs text-stone-500 file:border file:border-stone-800 file:bg-transparent file:px-3 file:py-2 file:text-[10px] file:uppercase file:tracking-[0.2em] file:text-stone-400 hover:file:border-stone-500"
  />
</div>

             <div>
  <label className="block mb-2 text-[10px] uppercase tracking-[0.25em] text-stone-600">
    Image
  </label>

  <input
    name="image_file"
    type="file"
    accept="image/*"
    className="w-full text-xs text-stone-500 file:border file:border-stone-800 file:bg-transparent file:px-3 file:py-2 file:text-[10px] file:uppercase file:tracking-[0.2em] file:text-stone-400 hover:file:border-stone-500"
  />
</div>

              <button
                type="submit"
                className="border border-stone-700 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-stone-400 hover:border-stone-400 hover:text-stone-100 transition"
              >
                Save
              </button>
            </form>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={addRows}
        className="border border-stone-800 px-5 py-3 text-xs uppercase tracking-[0.25em] text-stone-500 hover:border-stone-500 hover:text-stone-200 transition"
      >
        Add more lines
      </button>
    </div>
  );
}