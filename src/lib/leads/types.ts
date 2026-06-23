import type { Lead, LeadActivity, LeadNote, Profile } from "@/types/database";

export type LeadWithOwner = Lead & {
  owner: Pick<Profile, "id" | "full_name"> | null;
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
}