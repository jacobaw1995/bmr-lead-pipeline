import type {
  Lead,
  LeadActivity,
  LeadAppointment,
  LeadNote,
  Profile,
} from "@/types/database";

export type LeadWithOwner = Lead & {
  owner: Pick<Profile, "id" | "full_name"> | null;
  appointments?: LeadAppointment[];
};

export type NoteWithAuthor = LeadNote & {
  author: Pick<Profile, "id" | "full_name"> | null;
};

export type ActivityWithActor = LeadActivity & {
  actor: Pick<Profile, "id" | "full_name"> | null;
};

export interface LeadHistory {
  notes: NoteWithAuthor[];
  activity: ActivityWithActor[];
  /** Resolved profile names for reassigned from/to owner IDs */
  ownerNames: Record<string, string>;
}