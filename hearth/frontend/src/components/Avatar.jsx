export default function Avatar({ name, picture, size = 'md' }) {
  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (picture) {
    return (
      <img
        src={picture}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover ring-2 ring-white`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className={`${sizes[size]} rounded-full bg-hearth-100 text-hearth-700 flex items-center justify-center font-semibold ring-2 ring-white`}>
      {initials}
    </div>
  );
}
