export default function ConfidenceBadge({ confidence }) {
  const pct = Math.round((confidence || 0) * 100);

  let color = 'badge-green';
  let label = 'High';
  if (pct < 50) {
    color = 'badge-red';
    label = 'Low';
  } else if (pct < 80) {
    color = 'badge-yellow';
    label = 'Medium';
  }

  return (
    <span className={color} title={`${pct}% confidence`}>
      {label} ({pct}%)
    </span>
  );
}
