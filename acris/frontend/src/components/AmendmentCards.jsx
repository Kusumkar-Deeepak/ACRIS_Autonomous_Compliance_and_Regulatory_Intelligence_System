function AmendmentCards({
  mappings,
  onApprove,
  onReject,
  pendingApprove,
  pendingReject,
}) {
  return (
    <article className="acris-card p-5">
      <div>
        <p className="acris-label">Draft amendments</p>
        <h2 className="mt-1 font-display text-2xl text-white">
          Review and approve
        </h2>
      </div>

      <div className="mt-5 space-y-4">
        {(mappings || []).length ? (
          mappings.map((mapping) => {
            const reviewStatus = mapping.reviewStatus || "pending";
            return (
              <div
                key={mapping._id || mapping.doc_id}
                className="rounded-3xl border border-white/10 bg-slate-950/70 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {mapping.doc_id?.name || "Draft amendment"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Status: {reviewStatus}
                    </div>
                  </div>
                  <span
                    className={`acris-badge border ${reviewStatus === "approved" ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/20" : reviewStatus === "rejected" ? "bg-rose-500/15 text-rose-300 border-rose-400/20" : "bg-amber-500/15 text-amber-300 border-amber-400/20"}`}
                  >
                    {reviewStatus}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-200 whitespace-pre-wrap">
                  {mapping.draft_amendment || "Draft not generated yet."}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    className="acris-button"
                    disabled={pendingApprove || reviewStatus === "approved"}
                    onClick={() => onApprove(mapping._id)}
                  >
                    Approve
                  </button>
                  <button
                    className="acris-button-secondary"
                    disabled={pendingReject || reviewStatus === "rejected"}
                    onClick={() => onReject(mapping._id)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-slate-500">
            No draft amendments available yet.
          </p>
        )}
      </div>
    </article>
  );
}

export default AmendmentCards;
