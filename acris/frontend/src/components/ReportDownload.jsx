function ReportDownload({ report }) {
  if (!report) {
    return null;
  }

  const href = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/reports/${report._id}/download`;

  return (
    <a
      className="acris-button-secondary"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      Download report
    </a>
  );
}

export default ReportDownload;
