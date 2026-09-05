import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios.js";
import { useAuth } from "../app/AuthProvider.jsx";
import UploadPanel from "../components/UploadPanel.jsx";
import AgentTimeline from "../components/AgentTimeline.jsx";
import DiffViewer from "../components/DiffViewer.jsx";
import PolicyMappings from "../components/PolicyMappings.jsx";
import AmendmentCards from "../components/AmendmentCards.jsx";
import ReportDownload from "../components/ReportDownload.jsx";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatStatus(status) {
  const labels = {
    pending_parse: "Reading document",
    pending_diff: "Finding changes",
    pending_map: "Mapping impacted policies",
    pending_draft: "Preparing draft updates",
    done: "Completed",
    pending: "Pending review",
    approved: "Approved",
    rejected: "Rejected",
    error: "Needs attention",
  };
  return labels[status] || status || "Unknown";
}

function statusTone(status) {
  if (status === "done" || status === "approved")
    return "bg-emerald-500/15 text-emerald-300 border-emerald-400/20";
  if (status === "pending" || status?.startsWith("pending"))
    return "bg-amber-500/15 text-amber-300 border-amber-400/20";
  if (status === "rejected" || status === "error")
    return "bg-rose-500/15 text-rose-300 border-rose-400/20";
  return "bg-slate-500/15 text-slate-300 border-white/10";
}

function Dashboard() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRegulationId, setSelectedRegulationId] = useState("");

  const statsQuery = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => (await api.get("/dashboard/stats")).data,
    refetchInterval: 10000,
  });

  const regulationsQuery = useQuery({
    queryKey: ["regulations"],
    queryFn: async () => (await api.get("/regulations")).data,
    refetchInterval: 8000,
  });

  const reportsQuery = useQuery({
    queryKey: ["reports"],
    queryFn: async () => (await api.get("/reports")).data,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!selectedRegulationId && regulationsQuery.data?.length) {
      setSelectedRegulationId(regulationsQuery.data[0]._id);
      return;
    }

    const stillExists = (regulationsQuery.data || []).some(
      (item) => item._id === selectedRegulationId,
    );
    if (!stillExists && regulationsQuery.data?.length) {
      setSelectedRegulationId(regulationsQuery.data[0]._id);
    }
  }, [selectedRegulationId, regulationsQuery.data]);

  const detailQuery = useQuery({
    queryKey: ["regulation-detail", selectedRegulationId],
    queryFn: async () =>
      (await api.get(`/regulations/${selectedRegulationId}`)).data,
    enabled: Boolean(selectedRegulationId),
    refetchInterval: 8000,
  });

  const diffQuery = useQuery({
    queryKey: ["regulation-diff", selectedRegulationId],
    queryFn: async () =>
      (await api.get(`/regulations/${selectedRegulationId}/diff`)).data,
    enabled: Boolean(selectedRegulationId),
    refetchInterval: 8000,
  });

  const mappingsQuery = useQuery({
    queryKey: ["regulation-mappings", selectedRegulationId],
    queryFn: async () =>
      (await api.get(`/regulations/${selectedRegulationId}/mappings`)).data,
    enabled: Boolean(selectedRegulationId),
    refetchInterval: 8000,
  });

  const selectedRegulation = detailQuery.data?.regulation || null;
  const mappings =
    detailQuery.data?.mappings || mappingsQuery.data?.mappings || [];
  const changes = diffQuery.data?.changes || selectedRegulation?.changes || [];
  const reportForSelection = useMemo(() => {
    return (
      reportsQuery.data?.find((report) =>
        (report.regulation_ids || []).some((item) => {
          const itemId = item?._id || item;
          return String(itemId) === String(selectedRegulationId);
        }),
      ) || null
    );
  }, [reportsQuery.data, selectedRegulationId]);

  const approveMutation = useMutation({
    mutationFn: async (mappingId) =>
      (await api.post(`/amendments/${mappingId}/approve`)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["regulation-detail", selectedRegulationId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["regulation-mappings", selectedRegulationId],
      });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
      await queryClient.invalidateQueries({ queryKey: ["regulations"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (mappingId) =>
      (await api.post(`/amendments/${mappingId}/reject`)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["regulation-detail", selectedRegulationId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["regulation-mappings", selectedRegulationId],
      });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
      await queryClient.invalidateQueries({ queryKey: ["regulations"] });
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      <header className="acris-card flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="acris-label">ACRIS Phase 1</p>
          <h1 className="mt-2 font-display text-3xl text-white md:text-4xl">
            Compliance command center
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Upload a regulatory PDF, let the agents run synchronously, and
            review clause diffs, impacted policies, draft amendments, and report
            output in one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Signed in as
            </div>
            <div className="mt-1 text-sm font-semibold text-white">
              {user?.name || "Compliance Admin"}
            </div>
          </div>
          <button className="acris-button-secondary" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["Circulars processed", statsQuery.data?.circulars_processed ?? 0],
          ["Pending actions", statsQuery.data?.pending_actions ?? 0],
          ["Policies indexed", statsQuery.data?.docs_indexed ?? 0],
        ].map(([label, value]) => (
          <article key={label} className="acris-card p-5">
            <p className="acris-label">{label}</p>
            <div className="mt-3 text-4xl font-semibold text-white">
              {value}
            </div>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <UploadPanel
          onUploaded={async (payload) => {
            await queryClient.invalidateQueries({ queryKey: ["regulations"] });
            await queryClient.invalidateQueries({
              queryKey: ["dashboard-stats"],
            });
            await queryClient.invalidateQueries({ queryKey: ["reports"] });
            if (payload?.regulation_id) {
              setSelectedRegulationId(payload.regulation_id);
            }
          }}
        />

        <article className="acris-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="acris-label">Reports</p>
              <h2 className="mt-1 font-display text-2xl text-white">
                Latest outputs
              </h2>
            </div>
            {reportForSelection ? (
              <ReportDownload report={reportForSelection} />
            ) : (
              <span className="text-xs text-slate-400">
                Report link appears after processing completes.
              </span>
            )}
          </div>
          <div className="mt-5 space-y-3">
            {(reportsQuery.data || []).length ? (
              reportsQuery.data.map((report) => (
                <div
                  key={report._id}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {(report.regulation_ids || [])
                          .map((item) => item?.title)
                          .filter(Boolean)
                          .join(", ") || "Generated report"}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Generated {formatDate(report.generated_at)}
                      </div>
                    </div>
                    <span
                      className={`acris-badge border ${statusTone(report.status)}`}
                    >
                      {formatStatus(report.status)}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-400">
                    Changes: {report.summary?.total_changes ?? 0} | Docs:{" "}
                    {report.summary?.docs_affected ?? 0} | Critical:{" "}
                    {report.summary?.critical_count ?? 0}
                  </div>
                  {report.summary?.plain_language_summary ? (
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-6 text-slate-200">
                      {report.summary.plain_language_summary}
                    </div>
                  ) : null}
                  {(report.summary?.recommended_actions || []).length ? (
                    <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/70 p-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Recommended actions
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-slate-300">
                        {report.summary.recommended_actions.map(
                          (item, index) => (
                            <div key={`${report._id}-action-${index}`}>
                              • {item}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No reports generated yet.
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="mt-6 acris-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="acris-label">Regulations</p>
            <h2 className="mt-1 font-display text-2xl text-white">
              Upload history
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Click a row to inspect the full pipeline output
          </span>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Version</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-slate-950/55">
              {(regulationsQuery.data || []).map((regulation) => (
                <tr
                  key={regulation._id}
                  className={`cursor-pointer hover:bg-white/5 ${selectedRegulationId === regulation._id ? "bg-white/5" : ""}`}
                  onClick={() => setSelectedRegulationId(regulation._id)}
                >
                  <td className="px-4 py-4 font-medium text-white">
                    {regulation.title}
                  </td>
                  <td className="px-4 py-4 text-slate-300">
                    {regulation.source}
                  </td>
                  <td className="px-4 py-4 text-slate-300">
                    {formatDate(regulation.published_date)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`acris-badge border ${statusTone(regulation.status)}`}
                    >
                      {formatStatus(regulation.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-300">
                    v{regulation.version}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedRegulation ? (
        <section className="mt-6 space-y-6">
          <article className="acris-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="acris-label">Selected regulation</p>
                <h2 className="mt-1 font-display text-3xl text-white">
                  {selectedRegulation.title}
                </h2>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-400">
                  <span>Source: {selectedRegulation.source}</span>
                  <span>
                    Published: {formatDate(selectedRegulation.published_date)}
                  </span>
                  <span>Version: {selectedRegulation.version}</span>
                </div>
              </div>
              <span
                className={`acris-badge border ${statusTone(selectedRegulation.status)}`}
              >
                {formatStatus(selectedRegulation.status)}
              </span>
            </div>
          </article>

          <AgentTimeline status={selectedRegulation.status} />
          <DiffViewer changes={changes} />
          <PolicyMappings mappings={mappings} />
          <AmendmentCards
            mappings={mappings}
            onApprove={(mappingId) => approveMutation.mutate(mappingId)}
            onReject={(mappingId) => rejectMutation.mutate(mappingId)}
            pendingApprove={approveMutation.isPending}
            pendingReject={rejectMutation.isPending}
          />
        </section>
      ) : null}
    </div>
  );
}

export default Dashboard;
