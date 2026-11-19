"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import type { Meta } from "@/lib/services/types";
import Field from "@/components/ui/Field";

export interface FilterValues {
  search: string;
  indentTypeId: string;
  departmentId: string;
  statusId: string;
  createdBy: string;
  date: string;
  dateFrom: string;
  dateTo: string;
}

const KEYS = ["search", "indentTypeId", "departmentId", "statusId", "createdBy", "date", "dateFrom", "dateTo"] as const;

const serialize = (v: FilterValues) => JSON.stringify(KEYS.map((k) => v[k]));

// Filter bar (FR-12, FR-13). The state lives in the URL, so a refresh, the back
// button and shared links all keep the same view (DEC-017). Changing a filter
// resets to page 1. Text is debounced; the latest navigation wins.
export default function FilterBar({
  meta,
  creators,
  initial,
  error,
}: {
  meta: Pick<Meta, "departments" | "indentTypes" | "statuses">;
  creators: { id: string; name: string }[];
  initial: FilterValues;
  error?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const base = useId();

  useEffect(() => () => clearTimeout(timer.current), []);

  // Follow URL changes we did not make (back/forward, a shared link) without
  // overwriting what the user is typing while our own navigation is in flight.
  const initialKey = serialize(initial);
  const [seenKey, setSeenKey] = useState(initialKey);
  const [pushedKey, setPushedKey] = useState(initialKey);
  if (seenKey !== initialKey) {
    setSeenKey(initialKey);
    if (initialKey !== pushedKey) {
      setValues(initial);
      setPushedKey(initialKey);
    }
  }

  function push(next: FilterValues) {
    setPushedKey(serialize(next));
    const params = new URLSearchParams();
    for (const k of KEYS) if (next[k]) params.set(k, next[k]);
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  }

  function change(key: keyof FilterValues, value: string, debounce = false) {
    const next = { ...values, [key]: value };
    setValues(next);
    clearTimeout(timer.current);
    if (debounce) timer.current = setTimeout(() => push(next), 300);
    else push(next);
  }

  const empty: FilterValues = { search: "", indentTypeId: "", departmentId: "", statusId: "", createdBy: "", date: "", dateFrom: "", dateTo: "" };
  const dirty = KEYS.some((k) => values[k] !== "");
  const select = "input";

  return (
    <form
      role="search"
      aria-label="Filter indents"
      onSubmit={(e) => {
        e.preventDefault();
        clearTimeout(timer.current);
        push(values);
      }}
      className="panel no-print p-4"
      aria-busy={pending}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field id={`${base}-search`} label="Search Indent Number" className="sm:col-span-2">
          <input
            id={`${base}-search`}
            className="input"
            type="search"
            value={values.search}
            maxLength={30}
            placeholder="e.g. IND-000124"
            onChange={(e) => change("search", e.target.value, true)}
          />
        </Field>
        <Field id={`${base}-type`} label="Indent Type">
          <select id={`${base}-type`} className={select} value={values.indentTypeId} onChange={(e) => change("indentTypeId", e.target.value)}>
            <option value="">All types</option>
            {meta.indentTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Field>
        <Field id={`${base}-dept`} label="Department">
          <select id={`${base}-dept`} className={select} value={values.departmentId} onChange={(e) => change("departmentId", e.target.value)}>
            <option value="">All departments</option>
            {meta.departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </Field>
        <Field id={`${base}-status`} label="Status">
          <select id={`${base}-status`} className={select} value={values.statusId} onChange={(e) => change("statusId", e.target.value)}>
            <option value="">All statuses</option>
            {meta.statuses.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field id={`${base}-by`} label="Created By">
          <select id={`${base}-by`} className={select} value={values.createdBy} onChange={(e) => change("createdBy", e.target.value)}>
            <option value="">Anyone</option>
            {creators.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field id={`${base}-date`} label="Date">
          <input id={`${base}-date`} className="input" type="date" value={values.date} onChange={(e) => change("date", e.target.value)} />
        </Field>
        <Field id={`${base}-from`} label="Date range: from">
          <input id={`${base}-from`} className="input" type="date" value={values.dateFrom} onChange={(e) => change("dateFrom", e.target.value)} />
        </Field>
        <Field id={`${base}-to`} label="Date range: to">
          <input id={`${base}-to`} className="input" type="date" value={values.dateTo} onChange={(e) => change("dateTo", e.target.value)} />
        </Field>
        <div className="flex items-end">
          <button type="button" className="btn btn-secondary" disabled={!dirty} onClick={() => { clearTimeout(timer.current); setValues(empty); push(empty); }}>
            Clear filters
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[12.5px] text-[var(--red)]">
          {error}
        </p>
      )}
    </form>
  );
}
