function PolicyMappings({ mappings }) {
  const scoreLabel = (score) => {
    const value = Number(score || 0);
    if (value >= 0.9) return "High impact";
    if (value >= 0.75) return "Medium impact";
    return "Low impact";
  };

  return (
    <article className="acris-card p-5">
      <div>
        <p className="acris-label">Policy mappings</p>
        <h2 className="mt-1 font-display text-2xl text-white">
          Affected documents
        </h2>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(mappings || []).length ? (
          mappings.map((mapping) => (
            <div
              key={mapping._id || mapping.doc_id}
              className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {mapping.doc_id?.name ||
                      mapping.doc_name ||
                      "Policy Document"}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {mapping.doc_id?.owner_team || "Compliance"}
                  </div>
                </div>
                <span className="acris-badge border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
                  {scoreLabel(mapping.relevance_score)}
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Match score: {Number(mapping.relevance_score || 0).toFixed(2)}
              </div>
              <div className="mt-3 text-sm text-slate-300">
                Affected clauses
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(mapping.affected_clauses || []).map((clause) => (
                  <span
                    key={clause}
                    className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300"
                  >
                    {clause}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">
            No company policy documents cross the relevance threshold yet.
          </p>
        )}
      </div>
    </article>
  );
}

export default PolicyMappings;
