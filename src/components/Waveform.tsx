const HEIGHTS = [60, 90, 40, 100, 55, 80, 35, 70, 50, 85, 45, 95];

export function Waveform({ active = true, className = "" }: { active?: boolean; className?: string }) {
  return (
    <div className={`flex h-14 items-end justify-center gap-1.5 ${className}`} aria-hidden>
      {HEIGHTS.map((height, i) => (
        <span
          key={i}
          className={`w-1.5 rounded-full bg-clay/70 ${active ? "wave-bar" : ""}`}
          style={{ height: `${active ? height : 22}%`, animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}
