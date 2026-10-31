import test from "node:test";
import assert from "node:assert/strict";
import { calcCurrentStreak, analyzeStreak } from "../src/domain/streak.js";
import { evaluateWeightTrend, diagnoseFeedbackLoop } from "../src/domain/feedbackLoop.js";

test("calcCurrentStreak calculates continuous complete days correctly", () => {
  const completeDays = new Set(["2026-10-26", "2026-10-27"]);
  // Tuesday 2026-10-27
  const streak = calcCurrentStreak("2026-10-27", completeDays);
  assert.equal(streak, 2);
});

test("analyzeStreak detects streak broken yesterday and reports lostStreak", () => {
  // Suppose Sunday 2026-10-25 was rest day.
  // Saturday 2026-10-24 was complete.
  // Friday 2026-10-23 was complete.
  // Monday 2026-10-26 was NOT complete.
  // Tuesday 2026-10-27 is today (not complete yet).
  const completeDays = new Set(["2026-10-23", "2026-10-24"]);
  const result = analyzeStreak("2026-10-27", completeDays);

  assert.equal(result.current, 0);
  assert.equal(result.todayComplete, false);
  assert.equal(result.yesterdayComplete, false);
  assert.equal(result.brokeYesterday, true);
  assert.equal(result.lostStreak, 2);
});

test("evaluateWeightTrend requires both weeks of data", () => {
  const asOf = "2026-10-27T00:00:00.000Z";
  // Only 1 record in this week, none in last week
  const bmiRecords = [
    { date: "2026-10-26T00:00:00.000Z", weightKg: 70 },
  ];
  const trend = evaluateWeightTrend({ bmiRecords, goalId: "giam_can", asOfDate: asOf });
  assert.equal(trend.evaluable, false);
  assert.equal(trend.reason, "not_enough_data");
});

test("diagnoseFeedbackLoop provides clear status when non-premium", () => {
  const diag = diagnoseFeedbackLoop({
    bmiRecords: [],
    target: { goalId: "giam_can", calories: 2000 },
    isPremium: false,
    now: new Date("2026-10-27T00:00:00.000Z"),
  });
  assert.equal(diag.status, "not_premium");
  assert.equal(diag.isPremium, false);
});

test("diagnoseFeedbackLoop detects insufficient data for premium users", () => {
  const diag = diagnoseFeedbackLoop({
    bmiRecords: [{ date: "2026-10-25T00:00:00.000Z", weightKg: 70 }],
    target: { goalId: "giam_can", calories: 2000, lastFeedbackCheckAt: null },
    isPremium: true,
    now: new Date("2026-10-27T00:00:00.000Z"),
  });
  assert.equal(diag.status, "insufficient_data");
  assert.equal(diag.isPremium, true);
});

