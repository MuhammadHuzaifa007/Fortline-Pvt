// ============================================================
// Fortline-Pvt CRM Domain Types
//
// Executive Sales-Operations types for Fortline-Pvt:
// - 30 Sales Members & Presence Model
// - WhatsApp Channels & Routing
// - KPI & SLA Configurations
// - Dashboard Summary & Exceptions
// ============================================================

export type PresenceStatus =
  | 'online'
  | 'away'
  | 'offline'
  | 'disconnected'
  | 'unknown';

export type PresenceSource =
  | 'heartbeat'
  | 'channel_activity'
  | 'inferred'
  | 'manual'
  | 'none';

export interface FortlineSalesMember {
  id: string;
  account_id?: string;
  name: string;
  member_code?: string;
  email?: string | null;
  division: string;
  designation: string;
  phone_number: string;
  whatsapp_phone_number?: string;
  whatsapp_phone_number_id?: string;
  channel_id?: string | null;
  is_active: boolean;
  presence_status: PresenceStatus;
  presence_source: PresenceSource;
  /** Live gateway connection status from fortline_channels (populated by loadSalesMembers join) */
  channel_connection_status?: 'connected' | 'disconnected' | null;
  channel_disconnect_classification?: DisconnectClassification | null;
  channel_last_disconnect_reason?: string | null;
  channel_last_disconnect_code?: number | null;
  channel_last_disconnect_at?: string | null;
  last_activity_at?: string | null;
  last_heartbeat_at?: string | null;
  last_inbound_at?: string | null;
  last_outbound_at?: string | null;
  kpi_profile?: {
    first_response_target_min: number;
    followup_target_hours: number;
  };
  notes?: string | null;
  created_at: string;
  updated_at: string;

  // Computed & monitoring aggregations
  assigned_contact_count?: number;
  assigned_contacts_count?: number;
  unanswered_count?: number;
  overdue_count?: number;
  today_activity_count?: number;
  avg_response_time_seconds?: number;
}

export type DisconnectClassification =
  | 'confirmed_logout'
  | 'temporary_timeout'
  | 'connection_replaced'
  | 'bad_session'
  | 'unknown';

export type FortlineSalesMemberWithPresence = FortlineSalesMember;

export interface FortlineChannel {
  id: string;
  account_id?: string;
  channel_name?: string;
  sales_member_id?: string | null;
  sales_member_name?: string | null;
  sales_member_division?: string | null;
  sales_member?: {
    id: string;
    name: string;
    division?: string;
  } | null;
  phone_number?: string;
  phone_number_id: string;
  waba_id?: string | null;
  display_phone_number?: string | null;
  connection_status: 'connected' | 'disconnected';
  webhook_status: 'active' | 'degraded' | 'failing' | 'pending';
  gateway_metadata?: Record<string, unknown> | null;
  last_successful_event_at?: string | null;
  last_delivery_error?: string | null;
  created_at: string;
  updated_at: string;
}

export type FortlineWhatsAppChannel = FortlineChannel;

export interface FortlineKpiConfig {
  id: number;
  first_response_target_min: number;
  followup_target_hours: number;
  unanswered_threshold_min: number;
  overdue_threshold_hours: number;
  online_window_min: number;
  away_window_min: number;
  business_hours_start: string;
  business_hours_end: string;
  alert_severity_unanswered: 'info' | 'warning' | 'critical';
  alert_severity_sla_breach: 'info' | 'warning' | 'critical';
  alert_severity_disconnect: 'info' | 'warning' | 'critical';
  updated_at?: string;
}

export interface FortlineCompanyProfile {
  id?: string;
  company_name: string;
  industry: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  address?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FortlineDashboardSummary {
  totalSalesMembers: number;
  onlineSalesMembers: number;
  awaySalesMembers: number;
  offlineSalesMembers: number;
  totalActiveChannels: number;
  activeChannels?: number;
  newLeadsToday: number;
  unansweredConversations: number;
  overdueConversations: number;
  avgFirstResponseTimeSeconds: number;
  avgFirstResponseTimeMinutes: number;
  messagesReceivedToday: number;
  messagesSentToday: number;
  pendingInternalWork: number;
  slaBreaches: number;
  openExceptions: number;
  trends?: Record<string, { delta: number; label: string }>;
}

export type FortlineDashboardKPIs = FortlineDashboardSummary;

export interface FortlineException {
  id: string;
  type:
    | 'unassigned_lead'
    | 'sla_breach'
    | 'sla_breached'
    | 'unanswered_lead'
    | 'unanswered_exceeded'
    | 'overdue_conversation'
    | 'channel_disconnected'
    | 'channel_warning'
    | 'delivery_failed'
    | 'webhook_error';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  created_at?: string;
  action_link?: string;
  sales_member_name?: string | null;
  sales_member_id?: string | null;
  conversation_id?: string | null;
  contact_id?: string | null;
  channel_id?: string | null;
}

export type FortlineExceptionItem = FortlineException;

export interface FortlineActivityItem {
  id: string;
  type: 'inbound_message' | 'outbound_message' | 'sla_breach' | 'channel_event' | 'assignment';
  title: string;
  description: string;
  snippet?: string;
  timestamp: string;
  division?: string;
  conversation_id?: string;
  sales_member_name?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  direction?: 'inbound' | 'outbound';
}

export interface FortlineDashboardResponse {
  kpis: FortlineDashboardKPIs;
  exceptions: FortlineExceptionItem[];
  recentActivity: FortlineActivityItem[];
  salesMembers: FortlineSalesMemberWithPresence[];
  divisions: string[];
}

export interface FortlineAuditLogItem {
  id: string;
  account_id?: string;
  actor_email: string | null;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}
