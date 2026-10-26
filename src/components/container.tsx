// Main content column: full width on small screens, about two thirds of the viewport on large ones.
export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full px-6 md:px-12 lg:w-[72%] lg:px-0 xl:w-[64%] ${className}`}>{children}</div>;
}
