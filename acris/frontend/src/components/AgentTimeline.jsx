function getStepStates(currentStatus) {
  const states = [
    "upcoming",
    "upcoming",
    "upcoming",
    "upcoming",
    "upcoming",
    "upcoming",
  ];

  if (!currentStatus) {
    return states;
  }

  if (currentStatus === "done") {
    return ["done", "done", "done", "done", "done", "done"];
  }

  if (currentStatus === "pending_parse") {
    return [
      "done",
      "in-progress",
      "upcoming",
      "upcoming",
      "upcoming",
      "upcoming",
    ];
  }

  if (currentStatus === "pending_diff") {
    return ["done", "done", "in-progress", "upcoming", "upcoming", "upcoming"];
  }

  if (currentStatus === "pending_map") {
    return ["done", "done", "done", "in-progress", "upcoming", "upcoming"];
  }

  if (currentStatus === "pending_draft") {
    return ["done", "done", "done", "done", "in-progress", "upcoming"];
  }

  return states;
}

function AgentTimeline({ status }) {
  const states = getStepStates(status);
  const steps = [
    ["1", "Intake", "Document received and validated"],
    ["2", "Reading", "Regulation text extracted"],
    ["3", "Change Detection", "Old and new clauses compared"],
    ["4", "Policy Mapping", "Impacted policy documents identified"],
    ["5", "Draft Suggestions", "Suggested policy updates prepared"],
    ["6", "Final Report", "Compliance report generated"],
  ];

  function stateBadge(stepState) {
    if (stepState === "done") return "done";
    if (stepState === "in-progress") return "in progress";
    return "upcoming";
  }

  return (
    <article className="acris-card p-5">
      <div>
        <p className="acris-label">Agent timeline</p>
        <h2 className="mt-1 font-display text-2xl text-white">
          Pipeline status
        </h2>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {steps.map(([id, title, subtitle], index) => {
          const stepState = states[index];
          const isDone = stepState === "done";
          const isInProgress = stepState === "in-progress";
          return (
            <div
              key={id}
              className={`rounded-2xl border px-4 py-4 ${isDone ? "border-emerald-400/20 bg-emerald-500/10" : isInProgress ? "border-amber-400/20 bg-amber-500/10" : "border-white/10 bg-white/5"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Step {id}
                </div>
                <span
                  className={`acris-badge ${isDone ? "bg-emerald-500/15 text-emerald-300" : isInProgress ? "bg-amber-500/15 text-amber-300" : "bg-slate-500/15 text-slate-300"}`}
                >
                  {stateBadge(stepState)}
                </span>
              </div>
              <div className="mt-3 text-lg font-semibold text-white">
                {title}
              </div>
              <div className="mt-1 text-sm text-slate-400">{subtitle}</div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default AgentTimeline;
