export function Logo() {
  return (
    <div className="flex items-center gap-2.5 leading-none select-none">
      <svg viewBox="0 0 40 40" className="size-10 shrink-0" aria-hidden="true">
        <rect width="40" height="40" rx="11" fill="#ff4f00" />
        <path d="M20 8l2.6 6.4L29 17l-6.4 2.6L20 26l-2.6-6.4L11 17l6.4-2.6z" fill="#fff" />
        <circle cx="29.5" cy="28.5" r="4.5" fill="#002fa7" />
      </svg>
      <div>
        <div className="text-[26px] font-extrabold tracking-tight text-io">
          Rek<span className="text-ib">AI</span>
        </div>
        <div className="mt-1 text-[11px] font-semibold text-ib">Esnaf için reklam şablonları</div>
      </div>
    </div>
  );
}
