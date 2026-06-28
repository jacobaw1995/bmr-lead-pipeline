import { formatFullAddress } from "@/lib/leads/address";
import { formatLeadDisplayName, getPrimaryPhone } from "@/lib/leads/profile";
import {
  APPOINTMENT_TYPE_LABELS,
  getSiteVisitAppointment,
  isAppointmentOverdue,
} from "@/lib/leads/appointments";
import type { AppointmentType, Lead, LeadAppointment } from "@/types/database";
import type { BriefItem, TodayAppointment } from "./types";
import { daysAgo, fieldLeadHref, startOfDay } from "./utils";

const PROPOSAL_STAGES = ["proposal_sent", "negotiating", "closed"] as const;

export interface RuleContext {
  now: Date;
  startToday: Date;
  yesterdayStart: Date;
  threeDaysAgo: Date;
  fiveDaysAgo: Date;
  oneDayAgo: Date;
  twoHoursFromNow: Date;
  scheduledByLead: Map<string, LeadAppointment[]>;
  poolCount: number;
}

export function buildRuleContext(now: Date = new Date()): RuleContext {
  const startToday = startOfDay(now);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return {
    now,
    startToday,
    yesterdayStart: daysAgo(1, now),
    threeDaysAgo: daysAgo(3, now),
    fiveDaysAgo: daysAgo(5, now),
    oneDayAgo,
    twoHoursFromNow: new Date(now.getTime() + 2 * 60 * 60 * 1000),
    scheduledByLead: new Map(),
    poolCount: 0,
  };
}

function daysSince(dateIso: string, from: Date): number {
  const d = startOfDay(new Date(dateIso));
  const f = startOfDay(from);
  return Math.floor((f.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
}

export function buildAppointmentCoachItems(
  todayAppointments: TodayAppointment[]
): BriefItem[] {
  const items: BriefItem[] = [];

  for (const apt of todayAppointments) {
    if (apt.isOverdue) {
      items.push({
        id: `overdue-${apt.id}`,
        kind: "appointment_overdue",
        priority: "urgent",
        priorityScore: 5,
        leadId: apt.leadId,
        leadName: apt.leadName,
        message: `${APPOINTMENT_TYPE_LABELS[apt.appointmentType]} with ${apt.leadName} passed — mark complete or reschedule`,
        actionLabel: "Wrap up visit",
        scheduledAt: apt.scheduledAt,
        appointmentType: apt.appointmentType,
        href: fieldLeadHref(apt.leadId),
      });
      continue;
    }

    if (apt.isSoon) {
      items.push({
        id: `soon-${apt.id}`,
        kind: "appointment_soon",
        priority: "urgent",
        priorityScore: 10,
        leadId: apt.leadId,
        leadName: apt.leadName,
        message: `Heads up — ${apt.leadName} visit starts soon`,
        actionLabel: "Open lead",
        scheduledAt: apt.scheduledAt,
        appointmentType: apt.appointmentType,
        href: fieldLeadHref(apt.leadId),
      });
    }
  }

  return items;
}

export function buildLeadCoachItems(
  lead: Lead,
  ctx: RuleContext
): BriefItem[] {
  const items: BriefItem[] = [];
  const leadAppointments = ctx.scheduledByLead.get(lead.id);

  if (
    lead.site_survey_complete_at &&
    new Date(lead.site_survey_complete_at) < ctx.startToday &&
    !PROPOSAL_STAGES.includes(lead.stage as (typeof PROPOSAL_STAGES)[number])
  ) {
    const days = daysSince(lead.site_survey_complete_at, ctx.now);
    items.push({
      id: `proposal-${lead.id}`,
      kind: "send_proposal",
      priority: "high",
      priorityScore: 20,
      leadId: lead.id,
      leadName: formatLeadDisplayName(lead),
      message:
        days >= 2
          ? `Site visit was ${days} days ago — send ${formatLeadDisplayName(lead)} a proposal`
          : `Site visit done — send a proposal to ${formatLeadDisplayName(lead)}`,
      actionLabel: "Send proposal",
      href: fieldLeadHref(lead.id),
    });
  }

  if (
    lead.proposal_sent_at &&
    (lead.stage === "proposal_sent" || lead.stage === "negotiating")
  ) {
    const sent = new Date(lead.proposal_sent_at);
    if (sent < ctx.startToday) {
      const days = daysSince(lead.proposal_sent_at, ctx.now);
      if (sent >= ctx.yesterdayStart) {
        items.push({
          id: `follow-gentle-${lead.id}`,
          kind: "follow_up_gentle",
          priority: "medium",
          priorityScore: 45,
          leadId: lead.id,
          leadName: formatLeadDisplayName(lead),
          message: `Proposal sent yesterday — light follow-up with ${formatLeadDisplayName(lead)}`,
          actionLabel: "Follow up",
          href: fieldLeadHref(lead.id),
        });
      } else {
        items.push({
          id: `follow-urgent-${lead.id}`,
          kind: "follow_up_urgent",
          priority: "high",
          priorityScore: days >= 4 ? 15 : 30,
          leadId: lead.id,
          leadName: formatLeadDisplayName(lead),
          message: `No follow-up in ${days} days — call ${formatLeadDisplayName(lead)}`,
          actionLabel: "Follow up now",
          href: fieldLeadHref(lead.id),
        });
      }
    }
  }

  if (lead.stage === "qualified") {
    const siteVisit = getSiteVisitAppointment(leadAppointments);
    const hasVisitScheduled = siteVisit?.state === "scheduled";
    if (
      !hasVisitScheduled &&
      !lead.site_survey_complete_at &&
      new Date(lead.updated_at) <= ctx.threeDaysAgo
    ) {
      items.push({
        id: `schedule-${lead.id}`,
        kind: "schedule_survey",
        priority: "medium",
        priorityScore: 55,
        leadId: lead.id,
        leadName: formatLeadDisplayName(lead),
        message: `Still qualified — book a site visit for ${formatLeadDisplayName(lead)}`,
        actionLabel: "Schedule visit",
        href: fieldLeadHref(lead.id),
      });
    }
  }

  const lastTouch = lead.last_contacted_at ?? lead.updated_at;
  const touchedAt = new Date(lastTouch);

  if (
    (lead.stage === "lead_captured" || lead.stage === "qualified") &&
    touchedAt <= ctx.oneDayAgo &&
    new Date(lead.created_at) <= ctx.oneDayAgo
  ) {
    items.push({
      id: `contact-${lead.id}`,
      kind: "new_lead_contact",
      priority: "medium",
      priorityScore: 50,
      leadId: lead.id,
      leadName: formatLeadDisplayName(lead),
      message: `${formatLeadDisplayName(lead)} needs a first touch — no contact in 24h+`,
      actionLabel: "Make contact",
      href: fieldLeadHref(lead.id),
    });
  }

  const hasUpcomingVisit = (leadAppointments ?? []).some(
    (a) =>
      a.status === "scheduled" &&
      new Date(a.scheduled_at).getTime() >= ctx.now.getTime()
  );

  if (
    touchedAt < ctx.fiveDaysAgo &&
    lead.stage !== "lead_captured" &&
    !["proposal_sent", "negotiating"].includes(lead.stage) &&
    !hasUpcomingVisit
  ) {
    items.push({
      id: `stale-${lead.id}`,
      kind: "stale_lead",
      priority: "low",
      priorityScore: 80,
      leadId: lead.id,
      leadName: formatLeadDisplayName(lead),
      message: `${formatLeadDisplayName(lead)} has gone quiet — time to check in`,
      actionLabel: "Check in",
      href: fieldLeadHref(lead.id),
    });
  }

  return items;
}

export function buildPoolItem(poolCount: number): BriefItem | null {
  if (poolCount <= 0) return null;
  return {
    id: "claim-pool",
    kind: "claim_pool",
    priority: "info",
    priorityScore: 70,
    leadName: `${poolCount} lead${poolCount === 1 ? "" : "s"}`,
    message: `${poolCount} unclaimed lead${poolCount === 1 ? "" : "s"} waiting in the pool`,
    actionLabel: "Review pool",
    href: "/field",
  };
}

/** Keep the highest-priority item per lead; pool/global items pass through */
export function dedupeCoachCalls(items: BriefItem[]): BriefItem[] {
  const byLead = new Map<string, BriefItem>();
  const global: BriefItem[] = [];

  for (const item of items) {
    if (!item.leadId) {
      global.push(item);
      continue;
    }
    const existing = byLead.get(item.leadId);
    if (!existing || item.priorityScore < existing.priorityScore) {
      byLead.set(item.leadId, item);
    }
  }

  return [...Array.from(byLead.values()), ...global].sort(
    (a, b) => a.priorityScore - b.priorityScore
  );
}

export function filterHiddenItems(
  items: BriefItem[],
  hiddenKeys: Set<string>
): BriefItem[] {
  return items.filter((item) => !hiddenKeys.has(item.id));
}

export function parseTodayAppointments(
  rows: Record<string, unknown>[],
  ctx: RuleContext
): TodayAppointment[] {
  return rows.flatMap((row) => {
    const leadRaw = row.leads;
    const lead = (Array.isArray(leadRaw) ? leadRaw[0] : leadRaw) as Pick<
      Lead,
      | "name"
      | "first_name"
      | "last_name"
      | "company_name"
      | "phone"
      | "cell_phone"
      | "street_address"
      | "city"
      | "state"
      | "zip"
      | "address"
      | "service_street_address"
      | "service_city"
      | "service_state"
      | "service_zip"
    > | null;

    if (!lead || !row.scheduled_at) return [];

    const scheduledAt = row.scheduled_at as string;
    const scheduledDate = new Date(scheduledAt);
    const isOverdue = isAppointmentOverdue(scheduledAt, ctx.now);
    const isSoon =
      !isOverdue &&
      scheduledDate.getTime() >= ctx.now.getTime() &&
      scheduledDate.getTime() <= ctx.twoHoursFromNow.getTime();

    return [
      {
        id: row.id as string,
        leadId: row.lead_id as string,
        leadName: formatLeadDisplayName(lead),
        location: formatFullAddress(lead),
        phone: getPrimaryPhone(lead),
        appointmentType: row.appointment_type as AppointmentType,
        scheduledAt,
        isSoon,
        isOverdue,
      },
    ];
  });
}