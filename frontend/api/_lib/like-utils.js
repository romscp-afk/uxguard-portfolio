export function likeCountsByCaseStudy(store) {
  const counts = new Map();
  for (const like of store.likes || []) {
    const key = Number(like.case_study_id);
    if (!Number.isFinite(key)) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

export function sameId(a, b) {
  return Number(a) === Number(b);
}
