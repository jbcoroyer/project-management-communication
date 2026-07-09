export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full ui-page-enter">{children}</div>;
}
