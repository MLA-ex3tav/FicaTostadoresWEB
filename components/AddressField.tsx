"use client";

import { Loader2, MapPin } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  GEO_MIN_QUERY_LENGTH,
  type GeoSuggestion,
} from "@/lib/geo";

export type AddressSelection = GeoSuggestion;

const DEBOUNCE_MS = 250;
const MAX_CACHE_ENTRIES = 60;

interface AddressFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (selection: AddressSelection) => void;
  error?: string;
  placeholder?: string;
}

export default function AddressField({
  id,
  value,
  onChange,
  onSelect,
  error,
  placeholder = "Calle, número, comuna, región",
}: AddressFieldProps) {
  const [suggestions, setSuggestions] = useState<AddressSelection[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const skipNextSearchRef = useRef(false);
  const cacheRef = useRef<Map<string, GeoSuggestion[]>>(new Map());

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    const term = value.trim();

    if (term.length < GEO_MIN_QUERY_LENGTH) {
      return;
    }

    const cacheKey = term.toLowerCase();
    const controller = new AbortController();
    let active = true;

    const timer = window.setTimeout(async () => {
      const cached = cacheRef.current.get(cacheKey);

      if (cached) {
        setLoading(false);
        setSuggestions(cached);
        setHighlightIndex(cached.length > 0 ? 0 : -1);
        setOpen(
          cached.length > 0 &&
            wrapperRef.current?.contains(document.activeElement) === true,
        );
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(
          `/api/geo/search?q=${encodeURIComponent(term)}`,
          { signal: controller.signal, headers: { Accept: "application/json" } },
        );

        if (!response.ok) {
          throw new Error("geo");
        }

        const data = (await response.json()) as { results?: GeoSuggestion[] };
        const results = Array.isArray(data.results) ? data.results : [];

        if (!active) {
          return;
        }

        if (cacheRef.current.size >= MAX_CACHE_ENTRIES) {
          cacheRef.current.clear();
        }

        cacheRef.current.set(cacheKey, results);

        setSuggestions(results);
        setHighlightIndex(results.length > 0 ? 0 : -1);
        setOpen(
          results.length > 0 &&
            wrapperRef.current?.contains(document.activeElement) === true,
        );
      } catch (requestError) {
        if (active && (requestError as Error).name !== "AbortError") {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (wrapperRef.current?.contains(event.target as Node)) {
        return;
      }

      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  function selectSuggestion(selection: AddressSelection) {
    skipNextSearchRef.current = true;
    onChange(selection.address);
    onSelect(selection);
    setSuggestions([]);
    setOpen(false);
    setHighlightIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((index) =>
        index + 1 >= suggestions.length ? 0 : index + 1,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((index) =>
        index - 1 < 0 ? suggestions.length - 1 : index - 1,
      );
      return;
    }

    if (event.key === "Enter") {
      const selection = suggestions[highlightIndex];

      if (selection) {
        event.preventDefault();
        selectSuggestion(selection);
      }
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-dark"
          aria-hidden
        />
        <input
          id={id}
          type="text"
          required
          maxLength={200}
          autoComplete="street-address"
          value={value}
          onChange={(event) => {
            const next = event.target.value;

            if (next.trim().length < GEO_MIN_QUERY_LENGTH) {
              setSuggestions([]);
              setOpen(false);
              setLoading(false);
            }

            onChange(next);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setOpen(true);
            }
          }}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-haspopup="listbox"
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] py-2.5 pl-10 pr-10 text-sm text-steel-light placeholder:text-steel-dark focus:border-orange/60 focus:outline-none focus:ring-1 focus:ring-orange/30"
        />
        {loading ? (
          <Loader2
            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-steel-dark"
            aria-hidden
          />
        ) : null}
      </div>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Sugerencias de dirección"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-panel p-1 shadow-lg shadow-black/40"
        >
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.lat}-${suggestion.lon}-${index}`}>
              <button
                type="button"
                role="option"
                aria-selected={index === highlightIndex}
                onMouseEnter={() => setHighlightIndex(index)}
                onClick={() => selectSuggestion(suggestion)}
                className={`flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  index === highlightIndex
                    ? "bg-white/[0.08]"
                    : "hover:bg-white/[0.04]"
                }`}
              >
                <MapPin
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange"
                  aria-hidden
                />
                <span className="text-xs leading-relaxed text-steel-mid">
                  {suggestion.address}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
