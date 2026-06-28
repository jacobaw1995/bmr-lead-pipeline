import type { AppointmentStatus, AppointmentType } from "@/types/database";

export interface CalendarSiteVisit {
  id: string;
  leadId: string;
  leadName: string;
  location: string | null;
  phone: string | null;
  repId: string;
  repName: string;
  appointmentType: AppointmentType;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  notes: string | null;
  isOverdue: boolean;
}

export type CalendarRepFilter = "all" | "mine" | string;