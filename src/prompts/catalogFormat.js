// Định dạng catalog món ăn đưa cho AI: gom theo nhóm (tên nhóm chỉ xuất hiện
// 1 lần) để prompt ngắn hơn. entries: [{ id, name, group, kcal }].
export function formatCatalog(entries, { withKcal = false } = {}) {
  if (entries.length === 0) return "(không có dữ liệu catalog)";

  const byGroup = new Map();
  for (const e of entries) {
    if (!byGroup.has(e.group)) byGroup.set(e.group, []);
    byGroup.get(e.group).push(withKcal ? `${e.id} | ${e.name} | ${Math.round(e.kcal)} kcal` : `${e.id} | ${e.name}`);
  }
  return [...byGroup].map(([group, lines]) => `## ${group}\n${lines.join("\n")}`).join("\n\n");
}
