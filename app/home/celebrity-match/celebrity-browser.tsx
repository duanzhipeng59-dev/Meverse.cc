"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { StarProfile } from "../../myfate-data";

const PAGE_SIZE = 6;

export default function CelebrityBrowser({ stars }: { stars: StarProfile[] }) {
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);
  const totalPages = Math.max(1, Math.ceil(stars.length / PAGE_SIZE));
  const pageStars = stars.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function goToPage(nextPage: number) {
    setPage(Math.min(totalPages, Math.max(1, nextPage)));
    window.requestAnimationFrame(() => {
      gridRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  return (
    <>
      <div className="mf-workspace-card-grid" ref={gridRef}>
        {pageStars.map((star, index) => (
          <Link
            className="mf-star-card"
            href={`/home/celebrity-match/${star.id}`}
            key={star.id}
          >
            <div
              className="mf-star-portrait"
              style={{ "--portrait-image": `url("${star.portraitSrc}")` } as React.CSSProperties}
            >
              <span className="mf-star-number">{String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0")}</span>
              <div className="mf-star-overlay">
                <div className="mf-star-tags">
                  {star.traits.slice(0, 2).map((trait) => <span key={trait}>{trait}</span>)}
                </div>
                <h2>{star.name}</h2>
                <p>{star.role}</p>
              </div>
            </div>
            <div className="mf-star-card-bottom">
              <span>{star.tagline}</span>
              <b aria-hidden="true">↗</b>
            </div>
          </Link>
        ))}
      </div>

      {totalPages > 1 ? (
        <nav className="mf-celebrity-pagination" aria-label="偶像列表翻页">
          <button type="button" disabled={page === 1} onClick={() => goToPage(page - 1)}>
            <span aria-hidden="true">←</span> 上一页
          </button>
          <span>第 {page} / {totalPages} 页</span>
          <button type="button" disabled={page === totalPages} onClick={() => goToPage(page + 1)}>
            下一页 <span aria-hidden="true">→</span>
          </button>
        </nav>
      ) : null}
    </>
  );
}
