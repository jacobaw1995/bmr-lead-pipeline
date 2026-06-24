import type { AppointmentType } from "@/types/database";

export type BriefItemKind =
  | "appointment_soon"
  | "appointment_today"
  | "send_proposal"
  | "follow_up_gentle"
  | "follow_up_urgent"
  | "schedule_survey"
  | "claim_pool"
  | "stale_lead"
  | "new_lead_contact"
  | "appointment_overdue";

export type BriefPriority = "urgent" | "high" | "medium" | "low" | "info";

export interface BriefItem {
  id: string;
  kind: BriefItemKind;
  priority: BriefPriority;
  priorityScore: number;
  leadId?: string;
  leadName: string;
  message: string;
  actionLabel: string;
  scheduledAt?: string;
  appointmentType?: AppointmentType;
  href: string;
}

export interface TodayAppointment {
  id: string;
  leadId: string;
  leadName: string;
  location: string | null;
  phone: string | null;
  appointmentType: AppointmentType;
  scheduledAt: string;
  isSoon: boolean;
  isOverdue: boolean;
}

export interface DailyBrief {
  greetingName: string;
  todayAppointments: TodayAppointment[];
  coachCalls: BriefItem[];
  actionCount: number;
  poolCount: number;
  appointmentsTodayCount: number;
  isAllClear: boolean;
}