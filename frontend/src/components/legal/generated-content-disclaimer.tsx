import { generatedContentDisclaimer } from "@/lib/legal-config";

export function GeneratedContentDisclaimer({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-warning-border bg-warning-soft px-4 py-3 text-xs font-semibold leading-5 text-warning ${className}`}
      role="note"
    >
      {generatedContentDisclaimer}
    </div>
  );
}
