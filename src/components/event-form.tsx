import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { sendAssignmentEmail } from "@/lib/notifications.functions";
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
  eventTypeLabels,
  eventTypes,
  toLocalInput,
  type CircleEvent,
  type EventType,
} from "@/lib/events";

type Member = { user_id: string; full_name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  circleId: string;
  members: Member[];
  event: CircleEvent | null;
  onSaved: () => void;
};

const UNASSIGNED = "unassigned";

function defaultStart() {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return toLocalInput(date);
}

export function EventFormSheet({
  open,
  onOpenChange,
  circleId,
  members,
  event,
  onSaved,
}: Props) {
  const isMobile = useIsMobile();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("appointment");
  const [startAt, setStartAt] = useState(defaultStart);
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>(UNASSIGNED);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(event?.title ?? "");
    setType(event?.type ?? "appointment");
    setStartAt(event ? toLocalInput(event.start_at) : defaultStart());
    setEndAt(event?.end_at ? toLocalInput(event.end_at) : "");
    setLocation(event?.location ?? "");
    setNotes(event?.notes ?? "");
    setAssignedTo(event?.assigned_to ?? UNASSIGNED);
  }, [open, event]);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Please sign in again.");

      const payload = {
        title: title.trim(),
        type,
        start_at: new Date(startAt).toISOString(),
        end_at: endAt ? new Date(endAt).toISOString() : null,
        location: location.trim() === "" ? null : location.trim(),
        notes: notes.trim() === "" ? null : notes.trim(),
        assigned_to: assignedTo === UNASSIGNED ? null : assignedTo,
      };

      const newAssignee = payload.assigned_to;
      let notifyId: string | null = null;

      if (event) {
        const { error } = await supabase
          .from("events")
          .update(payload)
          .eq("id", event.id);
        if (error) throw error;
        if (newAssignee && newAssignee !== event.assigned_to) {
          notifyId = event.id;
        }
        toast.success("Saved your changes.");
      } else {
        const { data: created, error } = await supabase
          .from("events")
          .insert({ ...payload, circle_id: circleId, created_by: user.id })
          .select("id")
          .single();
        if (error) throw error;
        if (newAssignee && created) notifyId = created.id;
        toast.success("Added to the calendar.");
      }

      if (notifyId) {
        try {
          await sendAssignmentEmail({ data: { kind: "event", id: notifyId } });
        } catch {
          // Saved either way — a missed email shouldn't block the family.
        }
      }
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Sorry, we couldn't save that.",
      );
    } finally {
      setBusy(false);
    }
  }

  const heading = event ? "Edit this" : "Add to the calendar";
  const blurb = event
    ? "Change the details and save."
    : "Appointments, visits, prescription collections — anything the family needs to know about.";

  const form = (
    <form onSubmit={handleSubmit} className="space-y-5 pb-2">
      <div className="space-y-2">
        <Label htmlFor="eventTitle">What is it?</Label>
        <Input
          id="eventTitle"
          value={title}
          required
          placeholder="GP appointment"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="eventType">Kind</Label>
        <Select value={type} onValueChange={(value) => setType(value as EventType)}>
          <SelectTrigger id="eventType" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {eventTypes.map((option) => (
              <SelectItem key={option} value={option}>
                {eventTypeLabels[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="eventStart">Starts</Label>
          <Input
            id="eventStart"
            type="datetime-local"
            value={startAt}
            required
            onChange={(e) => setStartAt(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eventEnd">Ends (optional)</Label>
          <Input
            id="eventEnd"
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="eventLocation">Where (optional)</Label>
        <Input
          id="eventLocation"
          value={location}
          placeholder="Riverside Surgery"
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="eventAssigned">Who&apos;s doing it?</Label>
        <Select value={assignedTo} onValueChange={setAssignedTo}>
          <SelectTrigger id="eventAssigned" className="w-full">
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
        <Label htmlFor="eventNotes">Anything helpful to add? (optional)</Label>
        <Textarea
          id="eventNotes"
          value={notes}
          rows={3}
          placeholder="Bring the repeat prescription slip"
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : event ? "Save changes" : "Add it"}
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
