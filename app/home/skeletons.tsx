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
    <div className="mf-zr mf-report-page-skeleton mf-star-route-skeleton" aria-busy="true" aria-label="正在加载完整明星报告">
      <ReportSkeletonTopbar />
      <section className="mf-report-skeleton-card is-pillars" aria-hidden="true">
        <SkeletonBlock className="is-line w-40" />
        <div className="mf-report-skeleton-pillars">
          {Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={index} />)}
        </div>
      </section>
      <section className="mf-report-skeleton-card is-chart" aria-hidden="true">
        <SkeletonBlock className="is-line w-40" />
        <SkeletonBlock className="is-line w-70" />
        <SkeletonBlock className="mf-report-skeleton-chart" />
      </section>
      {Array.from({ length: 3 }).map((_, index) => (
        <section className="mf-report-skeleton-card is-section" aria-hidden="true" key={index}>
          <SkeletonBlock className="is-line w-40" />
          <SkeletonBlock className="is-line w-100" />
          <SkeletonBlock className="is-line w-100" />
          <SkeletonBlock className="is-line w-70" />
        </section>
      ))}
    </div>
  );
}
function ReportSkeletonTopbar() {
  return (
    <div className="mf-report-skeleton-topbar" aria-hidden="true">
      <SkeletonBlock className="mf-skel-backarrow" />
      <div>
        <SkeletonBlock className="is-line w-40" />
        <SkeletonBlock className="is-line w-70" />
      </div>
      <SkeletonBlock className="mf-report-skeleton-share" />
    </div>
  );
}
