import { useState } from "react";
import api from "../api/axios.js";

const regulationDefaults = {
  source: "RBI",
  title: "",
  company_name: "Acme Bank",
};

const policyDefaults = {
  name: "",
  type: "policy",
  owner_team: "Compliance",
};

function UploadPanel({ onUploaded }) {
  const [mode, setMode] = useState("regulation");
  const [regulationForm, setRegulationForm] = useState(regulationDefaults);
  const [policyForm, setPolicyForm] = useState(policyDefaults);
  const [regulationFile, setRegulationFile] = useState(null);
  const [policyFile, setPolicyFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const upload = async () => {
    setMessage("");
    setLoading(true);

    try {
      if (mode === "regulation") {
        const formData = new FormData();
        formData.append("file", regulationFile);
        formData.append("source", regulationForm.source);
        formData.append("title", regulationForm.title);
        formData.append("company_name", regulationForm.company_name);
        const response = await api.post("/regulations/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setMessage(
          "Upload complete. Review plain-language changes, impacted policies, and download the generated report.",
        );
        await onUploaded?.(response.data);
      } else {
        const formData = new FormData();
        formData.append("file", policyFile);
        formData.append("name", policyForm.name);
        formData.append("type", policyForm.type);
        formData.append("owner_team", policyForm.owner_team);
        const response = await api.post("/policies/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setMessage(
          response.data?.is_new_version === false
            ? `No change detected. Policy is already at version ${response.data.version_number}.`
            : `Policy version ${response.data?.version_number || 1} indexed successfully. You can now run a regulation upload to see impacted sections.`,
        );
        await onUploaded?.(response.data);
      }

      setRegulationFile(null);
      setPolicyFile(null);
    } catch (error) {
      setMessage(error?.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="acris-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="acris-label">Upload</p>
          <h2 className="mt-1 font-display text-2xl text-white">
            PDF ingestion
          </h2>
        </div>
        <div className="inline-flex rounded-2xl border border-white/10 bg-slate-950/60 p-1 text-xs font-semibold">
          {["regulation", "policy"].map((item) => (
            <button
              key={item}
              type="button"
              className={`rounded-xl px-3 py-2 capitalize ${mode === item ? "bg-accent-300 text-slate-950" : "text-slate-300"}`}
              onClick={() => setMode(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {mode === "regulation" ? (
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="acris-label">Regulatory PDF</span>
            <input
              className="acris-input mt-2 file:mr-4 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:text-slate-200"
              type="file"
              accept="application/pdf"
              onChange={(event) =>
                setRegulationFile(event.target.files?.[0] || null)
              }
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="acris-label">Source</span>
              <select
                className="acris-input mt-2"
                value={regulationForm.source}
                onChange={(event) =>
                  setRegulationForm({
                    ...regulationForm,
                    source: event.target.value,
                  })
                }
              >
                <option>RBI</option>
                <option>SEBI</option>
                <option>MCA</option>
              </select>
            </label>
            <label className="block">
              <span className="acris-label">Title</span>
              <input
                className="acris-input mt-2"
                value={regulationForm.title}
                onChange={(event) =>
                  setRegulationForm({
                    ...regulationForm,
                    title: event.target.value,
                  })
                }
                placeholder="ESG Circular 47"
              />
            </label>
          </div>
          <label className="block">
            <span className="acris-label">Company name</span>
            <input
              className="acris-input mt-2"
              value={regulationForm.company_name}
              onChange={(event) =>
                setRegulationForm({
                  ...regulationForm,
                  company_name: event.target.value,
                })
              }
              placeholder="Acme Bank"
            />
          </label>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="acris-label">Policy PDF</span>
            <input
              className="acris-input mt-2 file:mr-4 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:text-slate-200"
              type="file"
              accept="application/pdf"
              onChange={(event) =>
                setPolicyFile(event.target.files?.[0] || null)
              }
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="acris-label">Document name</span>
              <input
                className="acris-input mt-2"
                value={policyForm.name}
                onChange={(event) =>
                  setPolicyForm({ ...policyForm, name: event.target.value })
                }
                placeholder="ESG_Policy_v2.1.pdf"
              />
            </label>
            <label className="block">
              <span className="acris-label">Type</span>
              <select
                className="acris-input mt-2"
                value={policyForm.type}
                onChange={(event) =>
                  setPolicyForm({ ...policyForm, type: event.target.value })
                }
              >
                <option value="policy">policy</option>
                <option value="SOP">SOP</option>
                <option value="template">template</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="acris-label">Owner team</span>
            <input
              className="acris-input mt-2"
              value={policyForm.owner_team}
              onChange={(event) =>
                setPolicyForm({ ...policyForm, owner_team: event.target.value })
              }
              placeholder="Risk & Compliance"
            />
          </label>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          className="acris-button"
          disabled={
            loading ||
            (mode === "regulation"
              ? !regulationFile || !regulationForm.title
              : !policyFile || !policyForm.name)
          }
          onClick={upload}
        >
          {loading
            ? "Processing..."
            : mode === "regulation"
              ? "Run full pipeline"
              : "Index policy"}
        </button>
        <p className="text-sm text-slate-400">
          {message ||
            "Upload a PDF to start. The system will process it step-by-step and then show human-friendly results."}
        </p>
      </div>
      {loading ? (
        <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
          Processing can take up to a couple of minutes for large PDFs. Keep
          this page open until completion.
        </div>
      ) : null}
    </article>
  );
}

export default UploadPanel;
