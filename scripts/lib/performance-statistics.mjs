// 이 파일은 성능 반복 측정값을 변경하지 않고 검토 가능한 집계 통계로 변환합니다.
import assert from "node:assert/strict";

function round(value, digits = 1) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function percentile(sortedValues, percentileValue) {
  const index = Math.max(0, Math.ceil(percentileValue * sortedValues.length) - 1);
  return sortedValues[index];
}

export function summarizeSamples(values, digits = 1) {
  assert.ok(values.length > 0, "performance statistics require at least one sample");
  assert.ok(values.every(Number.isFinite), "performance statistics require finite samples");

  const sortedValues = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);
  const median = sortedValues.length % 2 === 0
    ? (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
    : sortedValues[middleIndex];
  const mean = sortedValues.reduce((total, value) => total + value, 0) / sortedValues.length;
  const variance = sortedValues.reduce(
    (total, value) => total + ((value - mean) ** 2),
    0,
  ) / sortedValues.length;

  return {
    median: round(median, digits),
    p75: round(percentile(sortedValues, 0.75), digits),
    max: round(sortedValues.at(-1), digits),
    standardDeviation: round(Math.sqrt(variance), digits),
  };
}
