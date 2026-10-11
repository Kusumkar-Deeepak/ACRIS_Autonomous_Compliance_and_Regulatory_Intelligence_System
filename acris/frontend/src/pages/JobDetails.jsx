import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios.js";

const statusLabels = {
  queued: "Queued",
  pending: "Queued",
  running: "Running",
  completed: "Completed",
  done: "Completed",
  retrying: "Retrying",
  cancelled: "Cancelled",
  failed: "Failed",
  error: "Failed",
};

function JobDetails() {
  const { jobId } = useParams();
  const jobQuery = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => (await api.get(`/jobs/${jobId}`)).data.job,
    enabled: Boolean(jobId),
    refetchInterval: 5000,
  });

  if (jobQuery.isLoading) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-10 lg:px-6">
        <div className="acris-card p-6 text-sm text-slate-400">
          Loading job status...
        </div>
      </section>
    );
  }

  if (jobQuery.isError) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-10 lg:px-6">
        <div className="acris-card p-6">
          <p className="acris-label">Job unavailable</p>
          <h1 className="mt-2 font-display text-2xl text-white">
            We could not load this job
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            The job may not exist or may not belong to your organization.
          </p>
          <Link className="acris-button-secondary mt-5" to="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </section>
    );
  }

  const job = jobQuery.data;
  const status = job?.status || "unknown";

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 lg:px-6">
      <div className="mb-5">
        <Link className="text-sm text-slate-400 hover:text-white" to="/dashboard">
          ← Back to dashboard
        </Link>
      </div>
      <article className="acris-card p-6">
        <p className="acris-label">Compliance job</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-white">
              {job?.regulation_id?.title || "Regulation processing"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Job ID: {job?._id || jobId}
            </p>
          </div>
          <span className="acris-badge border border-white/10 bg-white/5 text-slate-200">
            {statusLabels[status] || status}
          </span>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <dt className="acris-label">Created</dt>
            <dd className="mt-2 text-sm text-slate-200">
              {job?.createdAt
                ? new Date(job.createdAt).toLocaleString()
                : "Not available"}
            </dd>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <dt className="acris-label">Progress</dt>
            <dd className="mt-2 text-sm text-slate-200">
              {job?.progress ?? "Not reported"}
            </dd>
          </div>
        </dl>

        {job?.error ? (
          <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
            {job.error.message || "The compliance job failed."}
          </div>
        ) : null}
      </article>
    </section>
  );
}

export default JobDetails;
