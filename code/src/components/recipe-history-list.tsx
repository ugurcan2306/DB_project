"use client";

import { useState } from "react";
import type { RecipeLogRow } from "@/lib/challenges";

export function RecipeHistoryList({ recipes }: { recipes: RecipeLogRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (recipes.length === 0) {
    return <p className="profile-empty">No recipes logged yet. Start a challenge and log your first cook!</p>;
  }

  return (
    <div className="recipe-history-list">
      {recipes.map((r) => {
        const isOpen = openId === r.id;
        const tagList = r.tags ? r.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
        const ingredientList = r.ingredients ? r.ingredients.split(",").map((i) => i.trim()).filter(Boolean) : [];

        return (
          <div key={r.id} className={`recipe-history-item-wrap${isOpen ? " open" : ""}`}>
            <button
              className="recipe-history-item"
              onClick={() => setOpenId(isOpen ? null : r.id)}
              aria-expanded={isOpen}
            >
              <div className="recipe-history-left">
                <span className="recipe-history-emoji">{r.challenge_emoji}</span>
                <div>
                  <div className="recipe-history-title">{r.recipe_title}</div>
                  <div className="recipe-history-meta">
                    {r.challenge_title}
                    {tagList.length > 0 ? (
                      <> · <span className="recipe-history-tags">{tagList.join(", ")}</span></>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="recipe-history-right">
                {r.qualified ? (
                  <span className="recipe-qualified">✓ Qualified</span>
                ) : (
                  <span className="recipe-not-qualified">Not qualified</span>
                )}
                <span className="recipe-history-date">
                  {new Date(r.logged_at).toLocaleDateString()}
                </span>
                <span className="recipe-history-chevron">{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>

            {isOpen && (
              <div className="recipe-history-detail">
                <div className="recipe-detail-grid">
                  <div className="recipe-detail-block">
                    <div className="recipe-detail-label">Challenge</div>
                    <div className="recipe-detail-value">
                      {r.challenge_emoji} {r.challenge_title}
                    </div>
                  </div>

                  <div className="recipe-detail-block">
                    <div className="recipe-detail-label">Logged on</div>
                    <div className="recipe-detail-value">
                      {new Date(r.logged_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="recipe-detail-block">
                    <div className="recipe-detail-label">Status</div>
                    <div className="recipe-detail-value">
                      {r.qualified ? (
                        <span className="recipe-qualified">✓ Counted toward challenge progress</span>
                      ) : (
                        <span className="recipe-not-qualified">Did not match required tag — not counted</span>
                      )}
                    </div>
                  </div>

                  {tagList.length > 0 && (
                    <div className="recipe-detail-block">
                      <div className="recipe-detail-label">Tags</div>
                      <div className="recipe-detail-tags">
                        {tagList.map((t) => (
                          <span key={t} className="tag">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {ingredientList.length > 0 && (
                    <div className="recipe-detail-block full">
                      <div className="recipe-detail-label">Ingredients</div>
                      <div className="recipe-detail-ingredients">
                        {ingredientList.map((ing) => (
                          <span key={ing} className="ingredient-pill">{ing}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
