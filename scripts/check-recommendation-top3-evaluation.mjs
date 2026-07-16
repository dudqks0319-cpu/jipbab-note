// 합성 100개 추천 회귀셋에서 목표 메뉴의 Top 3 포함률을 확인합니다.
import { evaluateRecommendationTop3 } from "../lib/recommendation-evaluation.ts";

const report = evaluateRecommendationTop3();
console.log("Recommendation Top 3 synthetic evaluation");
console.log(`Scenarios: ${report.scenarioCount}`);
console.log(`Passed: ${report.passed}`);
console.log(`Failed: ${report.failed}`);
console.log(`Top 3 hit rate: ${report.top3HitRatePercent}%`);
console.log("Caveat: synthetic regression fixtures are not human preference or field accuracy evidence.");

if (report.scenarioCount !== 100 || report.top3HitRatePercent < 85) {
  for (const result of report.results.filter((item) => !item.passed)) {
    console.log(`FAIL ${result.id}: expected ${result.targetRecipeName}, received ${result.top3.join(" | ")}`);
  }
  process.exit(1);
}
