import type { Lead, UserRole } from "@/types/database";

export function canEditLead(
  lead: Pick<Lead, "owner_id">,
  userId: string,
  userRole: UserRole
): boolean {
  return lead.owner_id === userId || userRole === "manager";
}