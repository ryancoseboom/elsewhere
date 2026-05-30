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

type TitleSlugFieldsProps = {
  defaultTitle?: string;
  defaultSlug?: string;
};

export default function TitleSlugFields({
  defaultTitle = "",
  defaultSlug = "",
}: TitleSlugFieldsProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [slug, setSlug] = useState(defaultSlug);
  const [slugTouched, setSlugTouched] = useState(Boolean(defaultSlug));

  function handleTitleChange(value: string) {
    setTitle(value);

    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(slugify(value));
  }

  return (
    <>
      <div>
        <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
          Title
        </label>
        <input
          name="title"
          required
          value={title}
          onChange={(event) => handleTitleChange(event.target.value)}
          className="w-full bg-transparent border-b border-stone-700 px-1 py-3 text-xl text-stone-100 outline-none focus:border-stone-300"
          placeholder="Red Crystal Heart"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.25em] text-stone-500 mb-2">
          Slug
        </label>
        <input
          name="slug"
          value={slug}
          onChange={(event) => handleSlugChange(event.target.value)}
          className="w-full bg-transparent border-b border-stone-700 px-1 py-3 text-stone-100 outline-none focus:border-stone-300"
          placeholder="red-crystal-heart"
        />
      </div>
    </>
  );
}