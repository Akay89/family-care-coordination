import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useCircles } from "@/hooks/use-circles";
import { useCircleMemberNames } from "@/hooks/use-circle-events";
import {
  useCircleUpdates,
  useUpdateComments,
  useUpdateReactions,
  useUpdatesRealtime,
} from "@/hooks/use-circle-updates";
import {
  reactionEmojis,
  relativeTime,
  type CircleUpdate,
  type ReactionEmoji,
} from "@/lib/updates";
import { Button } from "@/components/ui/button";
import { CardListSkeleton, LoadError } from "@/components/data-state";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/updates")({
  component: UpdatesPage,
});

function useCurrentUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);
  return userId;
}

function UpdatesPage() {
  const { activeCircle, canEdit, isOrganiser } = useCircles();
  const circleId = activeCircle?.id;
  const userId = useCurrentUserId();

  const updates = useCircleUpdates(circleId);
  const members = useCircleMemberNames(circleId);
  useUpdatesRealtime(circleId);

  const rows = updates.data ?? [];
  const ids = useMemo(() => rows.map((row) => row.id), [rows]);
  const reactions = useUpdateReactions(ids);
  const comments = useUpdateComments(ids);

  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [editing, setEditing] = useState<CircleUpdate | null>(null);
  const [editBody, setEditBody] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CircleUpdate | null>(null);

  const names = new Map(
    (members.data ?? []).map((member) => [member.user_id, member.full_name]),
  );
  const nameFor = (id: string | null) =>
    (id && names.get(id)) || "Family member";

  async function post() {
    if (!circleId || !userId || !body.trim()) return;
    setPosting(true);
    const { error } = await supabase
      .from("updates")
      .insert({ circle_id: circleId, author_id: userId, body: body.trim() });
    setPosting(false);
    if (error) {
      toast.error("Sorry, that update could not be shared.");
      return;
    }
    setBody("");
    updates.refetch();
  }

  async function saveEdit() {
    if (!editing || !editBody.trim()) return;
    const { error } = await supabase
      .from("updates")
      .update({ body: editBody.trim(), edited_at: new Date().toISOString() })
      .eq("id", editing.id);
    if (error) {
      toast.error("Sorry, that change could not be saved.");
      return;
    }
    setEditing(null);
    updates.refetch();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { error } = await supabase
      .from("updates")
      .delete()
      .eq("id", pendingDelete.id);
    setPendingDelete(null);
    if (error) {
      toast.error("Sorry, that update could not be removed.");
      return;
    }
    updates.refetch();
  }

  async function toggleReaction(updateId: string, emoji: ReactionEmoji) {
    if (!userId) return;
    const mine = (reactions.data ?? []).find(
      (row) =>
        row.update_id === updateId &&
        row.user_id === userId &&
        row.emoji === emoji,
    );
    if (mine) {
      await supabase.from("update_reactions").delete().eq("id", mine.id);
    } else {
      await supabase
        .from("update_reactions")
        .insert({ update_id: updateId, user_id: userId, emoji });
    }
    reactions.refetch();
  }

  async function addComment(updateId: string, text: string) {
    if (!userId || !text.trim()) return;
    const { error } = await supabase
      .from("update_comments")
      .insert({ update_id: updateId, author_id: userId, body: text.trim() });
    if (error) {
      toast.error("Sorry, that reply could not be added.");
      return;
    }
    comments.refetch();
  }

  async function deleteComment(id: string) {
    await supabase.from("update_comments").delete().eq("id", id);
    comments.refetch();
  }

  return (
    <section>
      <h1 className="text-3xl font-semibold sm:text-4xl">Updates</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Short notes to keep everyone in the loop, without endless group chats.
      </p>

      {canEdit ? (
        <div className="mt-8 max-w-2xl rounded-2xl border border-border bg-card p-5">
          <label htmlFor="update-body" className="text-lg font-semibold">
            Share an update with the family
          </label>
          <Textarea
            id="update-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Mum had a good day today…"
            rows={3}
            className="mt-3 text-base"
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={post} disabled={posting || !body.trim()} size="lg">
              {posting ? "Sharing…" : "Share update"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-8 max-w-2xl rounded-2xl border border-border bg-card p-5 text-base text-muted-foreground">
          You can read updates, react and reply, but only members can post new
          updates.
        </p>
      )}

      {updates.isError ? (
        <LoadError what="the updates" onRetry={() => void updates.refetch()} />
      ) : updates.isLoading ? (
        <CardListSkeleton rows={3} className="mt-8 max-w-2xl space-y-3" />
      ) : rows.length === 0 ? (
        <div className="mt-8 max-w-2xl rounded-2xl border border-dashed border-border p-8 text-center">
          <MessageCircle
            className="mx-auto size-8 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-3 text-base text-muted-foreground">
            No updates yet. The first one is often the hardest — a short line is
            plenty.
          </p>
        </div>
      ) : (
        <ul className="mt-8 max-w-2xl space-y-4">
          {rows.map((update) => {
            const updateReactions = (reactions.data ?? []).filter(
              (row) => row.update_id === update.id,
            );
            const thread = (comments.data ?? []).filter(
              (row) => row.update_id === update.id,
            );
            const isMine = update.author_id === userId;
            const isOpen = openThread === update.id;

            return (
              <li
                key={update.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-lg font-semibold">
                    {nameFor(update.author_id)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {relativeTime(update.created_at)}
                    {update.edited_at ? " · edited" : ""}
                  </p>
                </div>

                {editing?.id === update.id ? (
                  <div className="mt-3">
                    <Textarea
                      value={editBody}
                      onChange={(event) => setEditBody(event.target.value)}
                      rows={3}
                      className="text-base"
                    />
                    <div className="mt-3 flex gap-2">
                      <Button onClick={saveEdit} disabled={!editBody.trim()}>
                        Save
                      </Button>
                      <Button variant="ghost" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 whitespace-pre-wrap text-base">
                    {update.body}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {reactionEmojis.map((emoji) => {
                    const forEmoji = updateReactions.filter(
                      (row) => row.emoji === emoji,
                    );
                    const mine = forEmoji.some((row) => row.user_id === userId);
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => toggleReaction(update.id, emoji)}
                        aria-pressed={mine}
                        aria-label={`React with ${emoji}`}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-base transition-colors",
                          mine
                            ? "border-primary bg-teal-soft text-primary"
                            : "border-border hover:border-primary",
                        )}
                      >
                        <span aria-hidden="true">{emoji}</span>
                        {forEmoji.length > 0 && (
                          <span className="ml-1.5 text-sm font-medium">
                            {forEmoji.length}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  <Button
                    variant="ghost"
                    onClick={() => setOpenThread(isOpen ? null : update.id)}
                    aria-expanded={isOpen}
                  >
                    {thread.length === 0
                      ? "Reply"
                      : `${thread.length} ${thread.length === 1 ? "reply" : "replies"}`}
                  </Button>

                  {isMine && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditing(update);
                        setEditBody(update.body);
                      }}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                      Edit
                    </Button>
                  )}
                  {(isMine || isOrganiser) && (
                    <Button
                      variant="ghost"
                      onClick={() => setPendingDelete(update)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Delete
                    </Button>
                  )}
                </div>

                {isOpen && (
                  <div className="mt-4 border-t border-border pt-4">
                    <ul className="space-y-3">
                      {thread.map((comment) => (
                        <li key={comment.id} className="text-base">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-medium">
                              {nameFor(comment.author_id)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {relativeTime(comment.created_at)}
                            </span>
                            {(comment.author_id === userId || isOrganiser) && (
                              <button
                                type="button"
                                onClick={() => deleteComment(comment.id)}
                                className="text-sm text-muted-foreground underline"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <p className="mt-1 whitespace-pre-wrap">
                            {comment.body}
                          </p>
                        </li>
                      ))}
                    </ul>
                    <CommentBox
                      onSubmit={(text) => addComment(update.id, text)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this update?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed for everyone in the circle, along with any
              replies and reactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function CommentBox({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");

  return (
    <div className="mt-4">
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Add a reply…"
        rows={2}
        aria-label="Add a reply"
        className="text-base"
      />
      <div className="mt-2 flex justify-end">
        <Button
          disabled={!text.trim()}
          onClick={() => {
            onSubmit(text);
            setText("");
          }}
        >
          Reply
        </Button>
      </div>
    </div>
  );
}
