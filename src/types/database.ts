export type UserRole = "salesman" | "manager";

/** Free text — standard picks from STANDARD_LEAD_SOURCES or custom entry */
export type LeadSource = string;

export type ThemePreference = "light" | "dark";

export type LeadStage =
  | "lead_captured"
  | "qualified"
  | "proposal_sent"
  | "negotiating"
  | "closed";

export type LeadStatus = "active" | "closed_won" | "closed_lost";

export type ActivityAction =
  | "created"
  | "stage_changed"
  | "status_changed"
  | "reassigned"
  | "value_set"
  | "edited";

export type AppointmentType = "inspection" | "site_survey";

export type AppointmentStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  monthly_close_goal: number | null;
  theme_preference?: ThemePreference;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  phone: string | null;
  cell_phone: string | null;
  secondary_phone: string | null;
  email: string | null;
  address: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  billing_street_address: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zip: string | null;
  service_street_address: string | null;
  service_city: string | null;
  service_state: string | null;
  service_zip: string | null;
  existing_roof_type: string | null;
  roof_type_requested: string | null;
  remodel_or_new_construction: string | null;
  homeowner_or_contractor: string | null;
  inspection_scheduled_at: string | null;
  roof_scope_ordered_at: string | null;
  site_survey_complete_at: string | null;
  quote_presented_at: string | null;
  proposal_sent_at: string | null;
  last_contacted_at: string | null;
  source: LeadSource;
  stage: LeadStage;
  status: LeadStatus;
  value: number | null;
  owner_id: string | null;
  lost_reason: string | null;
  closed_won_project_created: boolean;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  intake_checklist: Record<string, unknown> | null;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  actor_id: string;
  action: ActivityAction;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
}

export interface LeadAppointment {
  id: string;
  lead_id: string;
  owner_id: string;
  appointment_type: AppointmentType;
  scheduled_at: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: Partial<Omit<Profile, "id">>;
        Relationships: [];
      };
      leads: {
        Row: Lead;
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          street_address?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          inspection_scheduled_at?: string | null;
          roof_scope_ordered_at?: string | null;
          site_survey_complete_at?: string | null;
          quote_presented_at?: string | null;
          proposal_sent_at?: string | null;
          last_contacted_at?: string | null;
          source?: LeadSource;
          stage?: LeadStage;
          status?: LeadStatus;
          value?: number | null;
          owner_id?: string | null;
          lost_reason?: string | null;
          closed_won_project_created?: boolean;
          created_at?: string;
          updated_at?: string;
          closed_at?: string | null;
        };
        Update: Partial<Omit<Lead, "id">>;
        Relationships: [
          {
            foreignKeyName: "leads_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_notes: {
        Row: LeadNote;
        Insert: {
          id?: string;
          lead_id: string;
          author_id: string;
          content: string;
          created_at?: string;
        };
        Update: Partial<Omit<LeadNote, "id">>;
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_notes_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_activity: {
        Row: LeadActivity;
        Insert: {
          id?: string;
          lead_id: string;
          actor_id: string;
          action: ActivityAction;
          from_value?: string | null;
          to_value?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<LeadActivity, "id">>;
        Relationships: [
          {
            foreignKeyName: "lead_activity_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_activity_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      my_closes_this_month: { Args: Record<string, never>; Returns: number };
      my_win_rate: { Args: Record<string, never>; Returns: number };
      my_avg_cycle_days: { Args: Record<string, never>; Returns: number };
      my_open_pipeline_value: { Args: Record<string, never>; Returns: number };
      my_active_lead_count: { Args: Record<string, never>; Returns: number };
      is_manager: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      lead_stage: LeadStage;
      lead_status: LeadStatus;
      activity_action: ActivityAction;
    };
    CompositeTypes: Record<string, never>;
  };
};