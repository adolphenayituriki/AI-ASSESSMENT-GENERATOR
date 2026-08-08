export default function BrandLogo({ size = 36, className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/10 ${className}`}
      style={{ width: size, height: size }}
    >
      <img src="/dufast-eduai.png" alt="DuFast EduAi logo" className="h-full w-full object-cover" />
    </span>
  );
}
