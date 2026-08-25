"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { StarProfile } from "../../myfate-data";

const ALL_CATEGORIES = "全部";

export default function CelebrityBrowser({ stars }: { stars: StarProfile[] }) {
  const categories = useMemo(
    () => Array.from(new Set(stars.flatMap((star) => star.categories ?? []))),
    [stars],
  );
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES);
  const visibleStars = activeCategory === ALL_CATEGORIES
    ? stars
    : stars.filter((star) => star.categories?.includes(activeCategory));

  return (
    <>
      {categories.length > 0 ? (
        <div className="mf-category-filter">
          <div className="mf-category-tabs" role="group" aria-label="按艺人类型筛选">
            {[ALL_CATEGORIES, ...categories].map((category) => (
              <button
                className={activeCategory === category ? "active" : undefined}
                type="button"
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(category)}
                key={category}
              >
                {category}
              </button>
            ))}
          </div>
          <span>共 {visibleStars.length} 位</span>
        </div>
      ) : null}

      <div className="mf-workspace-card-grid">
        {visibleStars.map((star, index) => (
          <Link
            className="mf-star-card"
            href={`/home/celebrity-match/${star.id}`}
            key={star.id}
          >
            <div
              className="mf-star-portrait"
              style={{ "--portrait-image": `url("${star.portraitSrc}")` } as React.CSSProperties}
            >
              <span className="mf-star-number">{String(index + 1).padStart(2, "0")}</span>
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
    </>
  );
}
