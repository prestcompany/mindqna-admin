export function countSameCreatedAt(items: { createdAt: string }[]): { [key: string]: number } {
  const createdAtCounts: { [key: string]: number } = {};

  // createdAt 값을 기준으로 개수를 카운트
  items.forEach((item) => {
    const createdAt = item.createdAt;
    if (createdAtCounts[createdAt]) {
      createdAtCounts[createdAt]++;
    } else {
      createdAtCounts[createdAt] = 1;
    }
  });

  const sortedCounts: { [key: string]: number } = {};
  Object.keys(createdAtCounts)
    .sort()
    .forEach((key) => {
      sortedCounts[key] = createdAtCounts[key];
    });

  return sortedCounts;
}

export function countItemsWithSameKey(
  items: { [key: string]: string }[],
  targetKey: string,
): { [key: string]: number } {
  const keyCounts: { [key: string]: number } = {};

  // targetKey를 기준으로 개수를 카운트
  items.forEach((item) => {
    const keyValue = item[targetKey];
    if (keyCounts[keyValue]) {
      keyCounts[keyValue]++;
    } else {
      keyCounts[keyValue] = 1;
    }
  });

  const sortedCounts: { [key: string]: number } = {};
  Object.keys(keyCounts)
    .sort()
    .forEach((key) => {
      sortedCounts[key] = keyCounts[key];
    });

  return sortedCounts;
}
