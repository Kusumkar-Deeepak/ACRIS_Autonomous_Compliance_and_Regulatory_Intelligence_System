function normalizeText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function shortPreview(value, maxLength = 360) {
  const normalized = normalizeText(value);
  if (!normalized) return "No content available.";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
}

function plainSummary(change) {
  if (change.summary) {
    return change.summary;
  }

  if (change.change_type === "added") {
    return "A new regulatory requirement has been introduced in this clause.";
  }
  if (change.change_type === "removed") {
    return "This older regulatory clause is no longer present in the latest document.";
  }
  return "This clause has been updated in the latest version of the regulation.";
}

function changeTone(type) {
  if (type === "added") {
    return "bg-emerald-500/15 text-emerald-300 border-emerald-400/20";
  }
  if (type === "removed") {
    return "bg-rose-500/15 text-rose-300 border-rose-400/20";
  }
  return "bg-amber-500/15 text-amber-300 border-amber-400/20";
}

function ChangeColumn({ title, text, emptyLabel }) {
  const preview = shortPreview(text);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
        {title}
      </div>
      <div className="mt-3 text-sm leading-7 text-slate-100">
        {normalizeText(text) ? preview : emptyLabel}
      </div>
    </div>
  );
}

function DiffViewer({ changes }) {
  return (
    <article className="acris-card p-5">
      <div>
        <p className="acris-label">Clause diffs</p>
        <h2 className="mt-1 font-display text-2xl text-white">
          Side-by-side comparison
        </h2>
      </div>

      <div className="mt-5 space-y-4">
        {(changes || []).length ? (
          changes.map((change, index) => {
            return (
              <div
                key={`${change.clause}-${index}`}
                className="rounded-3xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {change.clause}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Plain-language summary
                    </div>
                  </div>
                  <span
                    className={`acris-badge border ${changeTone(change.change_type)}`}
                  >
                    {change.change_type}
                  </span>
                </div>

                <div className="mt-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
                  {plainSummary(change)}
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <ChangeColumn
                    title="Earlier regulatory text"
                    text={change.old_text}
                    emptyLabel="No previous text"
                  />
                  <ChangeColumn
                    title="Current regulatory text"
                    text={change.new_text}
                    emptyLabel="No current text"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                  <span className="rounded-full bg-white/5 px-3 py-1">
                    Old chars: {change.old_text?.length || 0}
                  </span>
                  <span className="rounded-full bg-white/5 px-3 py-1">
                    New chars: {change.new_text?.length || 0}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-slate-500">
            No clause changes available yet.
          </p>
        )}
      </div>
    </article>
  );
}

export default DiffViewer;
