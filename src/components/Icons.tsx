const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const Icon = {
  home: () => (
    <svg viewBox="0 0 24 24" {...p}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
  ),
  plan: () => (
    <svg viewBox="0 0 24 24" {...p}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M8 15l2 2 4-4" /></svg>
  ),
  learn: () => (
    <svg viewBox="0 0 24 24" {...p}><path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6.5A2.5 2.5 0 0 0 4 21.5 2.5 2.5 0 0 0 6.5 24" transform="translate(0 -1.5)" /><path d="M9 7h7M9 11h5" /></svg>
  ),
  exam: () => (
    <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6" /></svg>
  ),
  drive: () => (
    <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /><path d="M12 14.5V21M9.6 11.2 3.3 9.5M14.4 11.2l6.3-1.7" /></svg>
  ),
  progress: () => (
    <svg viewBox="0 0 24 24" {...p}><path d="M3 21h18M6 17V11M11 17V6M16 17v-4M21 17V8" /></svg>
  ),
  check: () => (
    <svg viewBox="0 0 24 24" {...p} strokeWidth={3}><path d="m5 12 5 5 9-10" /></svg>
  ),
  star: ({ filled }: { filled?: boolean }) => (
    <svg viewBox="0 0 24 24" {...p} fill={filled ? 'currentColor' : 'none'}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>
  ),
  close: () => (
    <svg viewBox="0 0 24 24" {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
  ),
  arrow: () => (
    <svg viewBox="0 0 24 24" {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  ),
  back: () => (
    <svg viewBox="0 0 24 24" {...p}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
  ),
  flag: () => (
    <svg viewBox="0 0 24 24" {...p}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>
  ),
  replay: () => (
    <svg viewBox="0 0 24 24" {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></svg>
  ),
  play: () => (
    <svg viewBox="0 0 24 24" {...p} fill="currentColor"><path d="M7 4v16l13-8z" /></svg>
  ),
  search: () => (
    <svg viewBox="0 0 24 24" {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
  ),
  fire: () => (
    <svg viewBox="0 0 24 24" {...p}><path d="M12 22c4 0 7-2.7 7-7 0-4-3-6-4-9-1.5 2-2 3-3 3 0-2-1-4-3-6 0 4-4 6-4 12 0 4.3 3 7 7 7z" /></svg>
  ),
}
