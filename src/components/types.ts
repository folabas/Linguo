export type Suggestion = {
  id: string;
  type: "grammar" | "rewrite";
  title: string;
  detail?: string;
  apply: (t: string) => string;
};