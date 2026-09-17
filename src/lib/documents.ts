export const documentCategories = [
  "benefits",
  "legal",
  "letters",
  "insurance",
  "other",
] as const;

export type DocumentCategory = (typeof documentCategories)[number];

export type CircleDocument = {
  id: string;
  circle_id: string;
  file_path: string;
  file_name: string;
  category: DocumentCategory;
  description: string | null;
  uploaded_by: string;
  size_bytes: number;
  created_at: string;
};

export const categoryLabels: Record<DocumentCategory, string> = {
  benefits: "Benefits",
  legal: "Legal and wills",
  letters: "Letters",
  insurance: "Insurance",
  other: "Other",
};

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const acceptedTypes = ["application/pdf", "image/"] as const;

export function isAcceptedFile(file: File) {
  return file.type === "application/pdf" || file.type.startsWith("image/");
}

export function formatFileSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatUploadedAt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-120);
}
