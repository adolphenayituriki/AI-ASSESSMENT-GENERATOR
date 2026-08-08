export default function Spinner({ size = 'md', light = false }) {
  const sizes = { sm: 'h-5 w-5 border-2', md: 'h-8 w-8 border-2', lg: 'h-12 w-12 border-4' };
  return (
    <div
      className={`inline-block animate-spin rounded-full border-t-transparent ${sizes[size]} ${
        light ? 'border-white' : 'border-brand-green-dark'
      }`}
      role="status"
      aria-label="Loading"
    />
  );
}
