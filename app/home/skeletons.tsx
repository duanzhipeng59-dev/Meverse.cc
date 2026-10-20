// Gray shimmer placeholders shown instantly on route transition while the
// server streams the real page (App Router loading.tsx convention).

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`mf-skeleton ${className ?? ""}`} aria-hidden="true" />;
}

function WorkspaceFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mf-workspace-skeleton">
      <SkeletonBlock className="mf-skeleton-heading" />
      {children}
    </div>
  );
}

export function StarGridSkeleton() {
  return (
    <WorkspaceFrame>
      <div className="mf-skeleton-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <SkeletonBlock key={index} className="mf-skeleton-card is-portrait" />
        ))}
      </div>
    </WorkspaceFrame>
  );
}

export function ReportListSkeleton() {
  return (
    <WorkspaceFrame>
      {Array.from({ length: 4 }).map((_, index) => (
        <SkeletonBlock key={index} className="mf-skeleton-card is-row" />
      ))}
    </WorkspaceFrame>
  );
}

export function FormCardSkeleton() {
  return (
    <WorkspaceFrame>
      <SkeletonBlock className="mf-skeleton-title" />
      <SkeletonBlock className="is-line w-70" />
      {Array.from({ length: 3 }).map((_, index) => (
        <SkeletonBlock key={index} className="is-line w-100" />
      ))}
      <SkeletonBlock className="mf-skeleton-button" />
    </WorkspaceFrame>
  );
}

export function PlansSkeleton() {
  return (
    <WorkspaceFrame>
      <div className="mf-skeleton-grid is-plans">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonBlock key={index} className="mf-skeleton-card is-plan" />
        ))}
      </div>
    </WorkspaceFrame>
  );
}

export function DetailSkeleton() {
  return (
    <WorkspaceFrame>
      <SkeletonBlock className="mf-skeleton-hero" />
      {Array.from({ length: 3 }).map((_, index) => (
        <SkeletonBlock key={index} className="mf-skeleton-card is-row" />
      ))}
    </WorkspaceFrame>
  );
}


export function StarReportSkeleton() {
  return (
    <div className="mf-zr mf-star-route-skeleton" aria-busy="true" aria-label="正在加载明星报告">
      <div className="mf-skel-topbar" aria-hidden="true">
        <SkeletonBlock className="mf-skel-backarrow" />
        <SkeletonBlock className="mf-skel-backid" />
      </div>
      <SkeletonBlock className="mf-skeleton-hero" />
      {Array.from({ length: 4 }).map((_, index) => (
        <SkeletonBlock key={index} className="mf-skeleton-card is-row" />
      ))}
    </div>
  );
}
