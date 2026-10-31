export function sumKcal(entries) {
  let total = 0;
  for (const entry of entries) {
    total += entry.kcal;
  }
  return total;
}

export function calcDailyBalance({ intakeKcal, burnedKcal, targetKcal }) {
  const intake = Math.round(intakeKcal);
  const burned = Math.round(burnedKcal);
  const target = Math.round(targetKcal);
  return {
    intakeKcal: intake,
    burnedKcal: burned,
    netKcal: intake - burned,
    remainingKcal: target - intake,
  };
}
