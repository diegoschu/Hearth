import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : '?';

  return (
    <div className="flex items-center justify-between px-5 pt-5">
      <div>
        <div className="font-serif text-[26px] font-semibold tracking-tight text-hearth-dark">
          <span className="text-hearth-warm">h</span>earth
        </div>
        <div className="text-xs text-hearth-muted mt-0.5">your family's second brain</div>
      </div>
      <button
        onClick={logout}
        title="Sign out"
        className="w-9 h-9 rounded-full bg-gradient-to-br from-hearth-warm to-hearth-warm-light flex items-center justify-center text-white text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity"
      >
        {user?.picture ? (
          <img src={user.picture} alt="" className="w-full h-full rounded-full object-cover" />
        ) : (
          initials
        )}
      </button>
    </div>
  );
}
