"use client";

import UserAvatar from "@/components/user-avatar";

type UserSearchResult = {
  id: string;
  name: string;
  handle: string;
  avatarGradient: string;
  avatarUrl?: string;
};

type UserSearchPanelProps = {
  query: string;
  loading: boolean;
  error: string | null;
  results: UserSearchResult[];
  onQueryChange: (next: string) => void;
  onSelect: (handle: string) => void;
};

export default function UserSearchPanel({
  query,
  loading,
  error,
  results,
  onQueryChange,
  onSelect,
}: UserSearchPanelProps) {
  const hasQuery = query.trim().length > 0;

  return (
    <section className="motion-surface p-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">Search</p>
        <p className="text-[11px] text-slate-500">Find people by name or @handle.</p>
      </div>
      <div className="mt-3">
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search accounts..."
          className="h-10 w-full rounded-xl border border-[var(--line)] bg-white px-3 text-sm transition focus:border-[var(--brand)] focus:outline-none"
        />
        {hasQuery ? (
          <div className="mt-2 space-y-2">
            {loading ? <p className="text-xs text-slate-500">Searching...</p> : null}
            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            ) : null}
            {!loading && !error && results.length === 0 ? (
              <p className="text-xs text-slate-500">No accounts found.</p>
            ) : null}
            {results.length > 0 ? (
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {results.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => onSelect(result.handle)}
                    className="flex w-full items-center gap-3 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-left transition hover:border-[var(--brand)]"
                  >
                    <UserAvatar
                      name={result.name}
                      avatarGradient={result.avatarGradient}
                      avatarUrl={result.avatarUrl}
                      className="h-9 w-9 text-[11px] font-bold"
                      textClassName="text-[11px] font-bold text-white"
                      sizes="36px"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        @{result.handle}
                      </p>
                      <p className="truncate text-xs text-slate-500">{result.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-[11px] text-slate-500">Start typing to find accounts.</p>
        )}
      </div>
    </section>
  );
}
