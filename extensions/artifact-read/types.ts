export const READ_MODES = [
  "summary",
  "schema",
  "sample",
  "query",
  "list",
  "extract-preview",
] as const;

export type ReadMode = (typeof READ_MODES)[number];

export interface ArtifactReadParams {
  path: string;
  mode?: ReadMode;
  table?: string;
  query?: string;
  limit?: number;
  offset?: number;
  where?: string;
  order?: string;
}

export interface ArtifactReadResult {
  ok: boolean;
  detectedType: string;
  mode: ReadMode;
  output: string;
  suggestion?: string;
}

export type FileType =
  | "directory"
  | "csv"
  | "json"
  | "jsonl"
  | "sqlite"
  | "zip"
  | "tar"
  | "tar-gz"
  | "unknown";
