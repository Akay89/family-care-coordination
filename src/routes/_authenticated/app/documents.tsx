import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileText, Image as ImageIcon, Lock, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useCircles } from "@/hooks/use-circles";
import {
  useCircleDocuments,
  useCircleMemberNames,
} from "@/hooks/use-circle-documents";
import {
  categoryLabels,
  documentCategories,
  formatFileSize,
  formatUploadedAt,
  isAcceptedFile,
  MAX_FILE_BYTES,
  safeFileName,
  type CircleDocument,
  type DocumentCategory,
} from "@/lib/documents";

export const Route = createFileRoute("/_authenticated/app/documents")({
  head: () => ({
    meta: [
      { title: "Documents | CareCircle" },
      {
        name: "description",
        content:
          "Keep letters, benefit forms and paperwork safely in one place your care circle can find.",
      },
      { property: "og:title", content: "Documents | CareCircle" },
      {
        property: "og:description",
        content:
          "Keep letters, benefit forms and paperwork safely in one place your care circle can find.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const { activeCircle, canEdit, isOrganiser } = useCircles();
  const circleId = activeCircle?.id;
  const { data: documents, isLoading, refetch } = useCircleDocuments(circleId);
  const { data: names } = useCircleMemberNames(circleId);

  const [userId, setUserId] = useState<string | null>(null);
  useMemo(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>("other");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CircleDocument | null>(null);

  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = (documents ?? []).filter((doc) =>
      term === "" ? true : doc.file_name.toLowerCase().includes(term),
    );
    return documentCategories
      .map((cat) => ({
        category: cat,
        items: list.filter((doc) => doc.category === cat),
      }))
      .filter((group) => group.items.length > 0);
  }, [documents, search]);

  async function handleUpload(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (!file || !circleId) return;
    if (!isAcceptedFile(file)) {
      toast.error("Please choose a PDF or a photo.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("That file is larger than 10MB. Please choose a smaller one.");
      return;
    }
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uploader = userData.user?.id;
      if (!uploader) throw new Error("Please sign in again.");

      const path = `${circleId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("circle-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { error: rowError } = await supabase.from("documents").insert({
        circle_id: circleId,
        file_path: path,
        file_name: file.name,
        category,
        description: description.trim() === "" ? null : description.trim(),
        uploaded_by: uploader,
        size_bytes: file.size,
      });
      if (rowError) {
        await supabase.storage.from("circle-documents").remove([path]);
        throw rowError;
      }

      toast.success("Saved to your circle's documents.");
      setFile(null);
      setDescription("");
      setCategory("other");
      (formEvent.target as HTMLFormElement).reset();
      await refetch();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Sorry, we couldn't upload that file.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleOpen(doc: CircleDocument) {
    const { data, error } = await supabase.storage
      .from("circle-documents")
      .createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Sorry, we couldn't open that file just now.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function handleDelete() {
    const doc = pendingDelete;
    if (!doc) return;
    setPendingDelete(null);
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) {
      toast.error("Sorry, we couldn't remove that file.");
      return;
    }
    await supabase.storage.from("circle-documents").remove([doc.file_path]);
    toast.success("File removed.");
    await refetch();
  }

  function canDelete(doc: CircleDocument) {
    return doc.uploaded_by === userId || isOrganiser;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl sm:text-4xl">Documents</h1>
        <p className="text-muted-foreground">
          Letters, forms and useful paperwork, kept in one place the family can
          find.
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-4">
        <Lock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <p className="text-base">
          Only members of this care circle can see these files.
        </p>
      </div>

      {canEdit ? (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleUpload} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="docFile">Choose a PDF or photo (up to 10MB)</Label>
                <Input
                  id="docFile"
                  type="file"
                  accept="application/pdf,image/*"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="docCategory">What kind of paperwork is it?</Label>
                <Select
                  value={category}
                  onValueChange={(value) =>
                    setCategory(value as DocumentCategory)
                  }
                >
                  <SelectTrigger id="docCategory" className="w-full sm:max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {categoryLabels[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="docDescription">
                  A short note about it (optional)
                </Label>
                <Textarea
                  id="docDescription"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={busy || !file}>
                {busy ? "Uploading…" : "Add document"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="relative sm:max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          className="pl-10"
          placeholder="Search by file name"
          aria-label="Search documents by file name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading documents…</p>
      ) : grouped.length === 0 ? (
        <p className="text-muted-foreground">
          {search.trim() === ""
            ? "No documents yet. Anything you add here stays private to this circle."
            : "Nothing matches that name."}
        </p>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.category} className="space-y-3">
              <h2 className="font-display text-2xl">
                {categoryLabels[group.category]}
              </h2>
              <ul className="space-y-3">
                {group.items.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 gap-3">
                      {doc.file_name.toLowerCase().endsWith(".pdf") ? (
                        <FileText
                          className="mt-1 size-5 shrink-0 text-primary"
                          aria-hidden
                        />
                      ) : (
                        <ImageIcon
                          className="mt-1 size-5 shrink-0 text-primary"
                          aria-hidden
                        />
                      )}
                      <div className="min-w-0 space-y-1">
                        <p className="truncate font-medium">{doc.file_name}</p>
                        {doc.description ? (
                          <p className="text-muted-foreground">
                            {doc.description}
                          </p>
                        ) : null}
                        <p className="text-sm text-muted-foreground">
                          Added by {names?.[doc.uploaded_by] ?? "someone"} on{" "}
                          {formatUploadedAt(doc.created_at)}
                          {doc.size_bytes
                            ? ` · ${formatFileSize(doc.size_bytes)}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => void handleOpen(doc)}
                      >
                        Open
                      </Button>
                      {canDelete(doc) ? (
                        <Button
                          variant="ghost"
                          aria-label={`Remove ${doc.file_name}`}
                          onClick={() => setPendingDelete(doc)}
                        >
                          <Trash2 className="size-5" aria-hidden />
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this file?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {pendingDelete?.file_name} will be deleted for everyone in the
              circle. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              Remove file
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
