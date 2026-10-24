const statusStyles = {
  pending: 'badge-yellow',
  confirmed: 'badge-green',
  dismissed: 'badge-gray',
  auto_confirmed: 'badge-blue',
  connected: 'badge-green',
  error: 'badge-red',
  paused: 'badge-yellow',
};

const statusLabels = {
  pending: 'Needs Review',
  confirmed: 'Confirmed',
  dismissed: 'Dismissed',
  auto_confirmed: 'Auto-confirmed',
  connected: 'Connected',
  error: 'Error',
  paused: 'Paused',
};

export default function StatusBadge({ status }) {
  return (
    <span className={statusStyles[status] || 'badge-gray'}>
      {statusLabels[status] || status}
    </span>
  );
}
