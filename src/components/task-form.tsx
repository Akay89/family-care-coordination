import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  recurrenceLabels,
  taskRecurrences,
  type CircleTask,
  type TaskRecurrence,
} from "@/lib/tasks";

type Member = { user_id: string; full_name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  task: CircleTask | null;
  onSaved: () => void;
};

const UNASSIGNED = "unassigned";

export function TaskFormSheet({
  open,
  onOpenChange,
  members,
  task,
  onSaved,
}: Props) {
  const isMobile = useIsMobile();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>(UNASSIGNED);
  const [recurrence, setRecurrence] = useState<TaskRecurrence>("none");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !task) return;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setDueDate(task.due_date ?? "");
    setAssignedTo(task.assigned_to ?? UNASSIGNED);
    setRecurrence(task.recurrence);
  }, [open, task]);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (!task) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: title.trim(),
          description: description.trim() === "" ? null : description.trim(),
          due_date: dueDate === "" ? null : dueDate,
          assigned_to: assignedTo === UNASSIGNED ? null : assignedTo,
          recurrence,
        })
        .eq("id", task.id);
      if (error) throw error;
      toast.success("Saved your changes.");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Sorry, we couldn't save that.",
      );
    } finally {
      setBusy(false);
    }
  }

  const form = (
    <form onSubmit={handleSubmit} className="space-y-5 pb-2">
      <div className="space-y-2">
        <Label htmlFor="taskTitle">What needs doing?</Label>
        <Input
          id="taskTitle"
          value={title}
          required
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="taskDue">When by? (optional)</Label>
        <Input
          id="taskDue"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="taskAssigned">Who&apos;s doing it?</Label>
        <Select value={assignedTo} onValueChange={setAssignedTo}>
          <SelectTrigger id="taskAssigned" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Nobody yet</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="taskRepeat">Does it repeat?</Label>
        <Select
          value={recurrence}
          onValueChange={(value) => setRecurrence(value as TaskRecurrence)}
        >
          <SelectTrigger id="taskRepeat" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {taskRecurrences.map((option) => (
              <SelectItem key={option} value={option}>
                {recurrenceLabels[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="taskNotes">Anything helpful to add? (optional)</Label>
        <Textarea
          id="taskNotes"
          value={description}
          rows={3}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );

  const heading = "Task details";
  const blurb = "Add a date, choose who's doing it, or set it to repeat.";

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-2xl">{heading}</DrawerTitle>
            <DrawerDescription className="text-base">{blurb}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">{form}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">{heading}</DialogTitle>
          <DialogDescription className="text-base">{blurb}</DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
}
