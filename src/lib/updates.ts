export const reactionEmojis = ["❤️", "👍", "🙏"] as const;

export type ReactionEmoji = (typeof reactionEmojis)[number];

export type CircleUpdate = {
  id: string;
  circle_id: string;
  author_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
};

export type UpdateReaction = {
  id: string;
  update_id: string;
  user_id: string;
  emoji: string;
};

export type UpdateComment = {
  id: string;
  update_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

/** Kind, plain relative time, e.g. "just now", "5 minutes ago", "Tue 3pm". */
export function relativeTime(value: string) {
  const date = new Date(value);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }),
  });
}
