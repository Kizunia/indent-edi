"use client";

import { useEffect, useId, useRef, useState } from "react";
import { apiFetch, isAborted } from "@/lib/client/api";
import type { ItemOption } from "@/lib/services/types";
import Field, { describedBy } from "@/components/ui/Field";
import { matchOption } from "./draft";

// One of the two item inputs (SRS 8.2): "Item Name" or "Item Code". Both search
// the same item master, so picking from either one fills the other (the parent
// does that in onPick). Accessible combobox: Arrow keys, Enter, Escape, live
// list; older searches are cancelled so a slow answer never overwrites a newer one.
export default function ItemCombobox({
  id,
  label,
  field,
  value,
  required,
  error,
  placeholder,
  onType,
  onPick,
}: {
  id: string;
  label: string;
  field: "name" | "code";
  value: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  /** The user typed: the parent clears the selected item and the other input. */
  onType: (text: string) => void;
  onPick: (option: ItemOption) => void;
}) {
  const uid = useId();
  const listId = `${uid}-listbox`;
  const [options, setOptions] = useState<ItemOption[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abort = useRef<AbortController>(undefined);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      clearTimeout(timer.current);
      abort.current?.abort();
    };
  }, []);

  function runSearch(q: string) {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setSearching(true);
      setSearchError(false);
      try {
        const res = await apiFetch<{ items: ItemOption[]; hasMore: boolean }>(
          `/api/items?q=${encodeURIComponent(q)}&field=${field}`,
          { signal: controller.signal }
        );
        setOptions(res.items);
        setHasMore(res.hasMore);
        setActive(-1);
        setSearching(false);
      } catch (err) {
        if (isAborted(err)) return; // superseded by a newer search
        setSearching(false);
        setSearchError(true);
        setOptions([]);
      }
    }, 250);
  }

  function pick(option: ItemOption) {
    setOpen(false);
    onPick(option);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && active >= 0 && options[active]) {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
    }
  }

  // Leaving the field with text that exactly equals one known name/code selects it,
  // so typing a full code and pressing Tab fills the name without opening the list.
  function onBlur() {
    const exact = matchOption(value, options, field);
    setOpen(false);
    if (exact) onPick(exact);
  }

  return (
    <div ref={boxRef} className="relative">
      <Field id={id} label={label} required={required} error={error}>
        <input
          id={id}
          className="input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, error)}
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            runSearch(value);
          }}
          onChange={(e) => {
            onType(e.target.value);
            setOpen(true);
            runSearch(e.target.value);
          }}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        />
      </Field>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`Matching ${field === "name" ? "item names" : "item codes"}`}
          className="absolute z-20 mt-1 max-h-64 w-full min-w-64 overflow-auto rounded-[3px] border border-[var(--border-strong)] bg-white shadow"
        >
          {searching && <li className="px-3 py-2 text-[12.5px] text-[var(--ink-soft)]">Searching…</li>}
          {searchError && <li className="px-3 py-2 text-[12.5px] text-[var(--red)]">Could not search right now. Try again.</li>}
          {!searching && !searchError && options.length === 0 && (
            <li className="px-3 py-2 text-[12.5px] text-[var(--ink-soft)]">No matching items.</li>
          )}
          {options.map((o, i) => (
            <li
              key={o.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`cursor-pointer px-3 py-1.5 text-[13px] ${i === active ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--grey-soft)]"}`}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus so blur does not fire first
                pick(o);
              }}
            >
              <span className="mono font-semibold">{o.itemCode}</span> · {o.itemName}
              {o.specification && <span className="text-[var(--ink-soft)]"> — {o.specification}</span>}
            </li>
          ))}
          {hasMore && <li className="px-3 py-2 text-[12px] text-[var(--ink-soft)]">More items match. Refine your search.</li>}
        </ul>
      )}
    </div>
  );
}
