// The database returns labels as join rows: [{ issueId, labelId, label: { ... } }].
// The API sends plain labels instead: [{ id, name, color, ... }].
export function serializeIssue<T extends { labels: { label: unknown }[] }>(issue: T) {
  return { ...issue, labels: issue.labels.map((l) => l.label) } as Omit<T, 'labels'> & {
    labels: T['labels'][number]['label'][];
  };
}
