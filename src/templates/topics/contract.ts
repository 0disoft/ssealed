export interface TopicContract {
  readonly purpose: string;
  readonly decisions: readonly string[];
  readonly source?: string;
}
