import { HttpError } from "../errors.js";
import { buildDiversifySystemPrompt, buildDiversifyUserPrompt } from "../prompts/planDiversifyPrompt.js";
import { buildFoodRecognitionSystemPrompt, buildFoodRecognitionUserPrompt } from "../prompts/foodRecognitionPrompt.js";
import { detectInjectionSignal } from "../prompts/promptGuard.js";

// Nơi DUY NHẤT giữ ANTHROPIC_API_KEY và soạn prompt — client chỉ gửi dữ liệu
// có cấu trúc. Không có API key → chế độ mock (đủ để test cả luồng mà chưa
// tốn phí AI). Catalog được TRUYỀN VÀO từ service (đã lọc theo user).

const MODEL = "claude-sonnet-4-6";
const AI_TIMEOUT_MS = 60_000;

const isMockMode = () => !process.env.ANTHROPIC_API_KEY;

async function callAnthropic(system, userContent) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 2000, system, messages: [{ role: "user", content: userContent }] }),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  });
  if (!res.ok) {
    console.error(`[NutriCare] Anthropic API lỗi ${res.status}`);
    throw new HttpError(502, "Dịch vụ AI tạm thời không phản hồi.");
  }

  const data = await res.json();
  const text = data.content?.find((b) => b.type === "text")?.text ?? "";
  try {
    return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    throw new HttpError(502, "AI trả về dữ liệu không hợp lệ.");
  }
}

function logIfInjectionSuspected(note) {
  const flag = detectInjectionSignal(note);
  if (flag.flagged) console.warn("[NutriCare][injection_suspected]", { matched: flag.matched });
}

function mockDiversify(currentDays, catalog) {
  // Xác định (không random): đổi bữa ĐẦU TIÊN mỗi ngày sang món gần kcal nhất
  // để test được cả luồng "xem gợi ý → áp dụng".
  const nearestOther = (meal) =>
    catalog.filter((d) => d.id !== meal.dish_id).reduce((best, d) => (!best || Math.abs(d.kcal - meal.kcal) < Math.abs(best.kcal - meal.kcal) ? d : best), null);

  return {
    status: "ok",
    refusal_reason: null,
    injection_suspected: false,
    analysis: "Chế độ mock (chưa có ANTHROPIC_API_KEY): đề xuất đổi bữa đầu tiên mỗi ngày để bạn thử luồng áp dụng.",
    days: currentDays.map((day) => ({
      day_index: day.day_index,
      meals: day.meals.map((m, i) => ({ meal_slot: m.meal_slot, dish_id: i === 0 ? (nearestOther(m)?.id ?? m.dish_id) : m.dish_id })),
    })),
  };
}

// currentDays: [{ day_index, meals: [{ meal_slot, dish_id, name, kcal }] }]
export async function proposeDiversification({ currentDays, targetCalories, goalId, note }, catalog) {
  logIfInjectionSuspected(note);
  if (isMockMode()) return mockDiversify(currentDays, catalog);

  const system = buildDiversifySystemPrompt(catalog);
  const user = buildDiversifyUserPrompt({ currentPlanDays: currentDays, targetCalories, goalId, note });
  return callAnthropic(system, user);
}

// imageBase64 đi kèm như content block ảnh riêng — không đi qua prompt text.
export async function recognizeDishes(imageBase64, { mealSlot, userNote }, catalog) {
  logIfInjectionSuspected(userNote);
  if (isMockMode()) {
    const picks = [...catalog].sort(() => Math.random() - 0.5).slice(0, 2);
    return {
      status: "ok",
      refusal_reason: null,
      injection_suspected: false,
      items: picks.map((d) => ({ dish_id: d.id, matched_name: d.name, confidence: 0.8 })),
    };
  }

  const system = buildFoodRecognitionSystemPrompt(catalog);
  const userContent = [
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
    { type: "text", text: buildFoodRecognitionUserPrompt({ mealSlot, userNote }) },
  ];
  return callAnthropic(system, userContent);
}
