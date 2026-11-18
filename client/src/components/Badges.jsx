export function StatusBadge({ status }) {
  const tone = status.toLowerCase().replace(/\s+/g, '-');
  return <span className={`badge status-${tone}`}>{status}</span>;
}

export function PriorityMark({ priority }) {
  return <span className={`priority priority-${priority.toLowerCase()}`}>{priority}</span>;
}
