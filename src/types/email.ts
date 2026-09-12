// ============================================================
// Fortline-Pvt Email CRM Domain Types
// Microsoft 365 / Outlook Integration
// ============================================================

export type EmailProvider = 'microsoft365';

export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'syncing';

export type AuthorizationStatus = 'authorized' | 'unauthorized' | 'expired';

export type SyncStatus = 'idle' | 'syncing' | 'failed' | 'success';

export type SubscriptionStatus = 'active' | 'expired' | 'failed';

export type ThreadStatus = 'open' | 'closed';

export type ThreadPriority = 'normal' | 'high';

export type WaitingFor = 'employee' | 'client' | 'none';

export type LastSenderType = 'employee' | 'client';

export type EmailDirection = 'inbound' | 'outbound';

export interface EmailRecipient {
  name?: string | null;
  email: string;
}

export interface EmailAccount {
  id: string;
  sales_rep_id: string;
  email_address: string;
  display_name?: string | null;
  provider: EmailProvider;
  microsoft_user_id?: string | null;
  connection_status: ConnectionStatus;
  authorization_status: AuthorizationStatus;
  sync_status: SyncStatus;
  last_sync_at?: string | null;
  last_successful_sync_at?: string | null;
  last_error_at?: string | null;
  last_error_message?: string | null;
  sync_cursor?: string | null;
  historical_sync_days: number;
  created_at: string;
  updated_at: string;

  // Joined fields
  sales_member?: {
    id: string;
    name: string;
    division?: string;
    designation?: string;
  } | null;
}

export interface EmailSubscription {
  id: string;
  email_account_id: string;
  subscription_id: string;
  resource: string;
  change_type: string;
  expiration_at: string;
  status: SubscriptionStatus;
  last_renewal_at?: string | null;
  last_renewal_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailThread {
  id: string;
  email_account_id: string;
  sales_rep_id: string;
  provider_thread_id: string;
  subject: string;
  last_message_at: string;
  message_count: number;
  unread_count: number;
  status: ThreadStatus;
  priority: ThreadPriority;
  waiting_for: WaitingFor;
  is_overdue: boolean;
  first_response_at?: string | null;
  first_response_seconds?: number | null;
  avg_response_seconds?: number | null;
  client_email: string;
  client_name?: string | null;
  client_company?: string | null;
  last_sender_type: LastSenderType;
  has_attachments: boolean;
  created_at: string;
  updated_at: string;

  // Joined fields
  email_account?: EmailAccount | null;
  sales_member?: {
    id: string;
    name: string;
    division?: string;
    designation?: string;
  } | null;
  messages?: EmailMessage[];
}

export interface EmailMessage {
  id: string;
  thread_id: string;
  email_account_id: string;
  sales_rep_id: string;
  provider_message_id: string;
  provider_thread_id: string;
  direction: EmailDirection;
  sender_email: string;
  sender_name?: string | null;
  recipients: EmailRecipient[];
  cc?: EmailRecipient[] | null;
  bcc?: EmailRecipient[] | null;
  subject: string;
  body_text?: string | null;
  body_html?: string | null;
  snippet?: string | null;
  sent_at: string;
  received_at: string;
  is_read: boolean;
  has_attachments: boolean;
  is_draft: boolean;
  is_automated: boolean;
  internet_message_id?: string | null;
  in_reply_to?: string | null;
  provider_folder?: string | null;
  provider_metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;

  // Joined fields
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  id: string;
  message_id: string;
  provider_attachment_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  content_id?: string | null;
  is_inline: boolean;
  created_at: string;
}

export interface EmailNote {
  id: string;
  thread_id?: string | null;
  client_email?: string | null;
  sales_rep_id?: string | null;
  note_text: string;
  created_at: string;
}

export interface EmailSettings {
  id: number;
  timezone: string;
  normal_sla_hours: number;
  high_priority_sla_hours: number;
  business_hours_start: string;
  business_hours_end: string;
  working_days: number[]; // e.g. [1, 2, 3, 4, 5] for Mon-Fri
  historical_sync_days: number;
  created_at: string;
  updated_at: string;
}

export interface EmailAuditLog {
  id: string;
  actor_email: string;
  action: string;
  email_account_id?: string | null;
  thread_id?: string | null;
  message_id?: string | null;
  mailbox_email?: string | null;
  recipients?: EmailRecipient[] | null;
  details?: Record<string, unknown> | null;
  result: 'success' | 'failure';
  error_message?: string | null;
  created_at: string;
}

export interface EmailDashboardSummary {
  totalSalesMembers: number;
  connectedMailboxes: number;
  activeSubscriptions: number;
  totalThreads: number;
  openThreads: number;
  unreadThreads: number;
  overdueThreads: number;
  waitingForEmployee: number;
  waitingForClient: number;
  avgResponseTimeMinutes: number;
  emailsSentToday: number;
  emailsReceivedToday: number;
  syncErrorsCount: number;
}

export interface SendEmailPayload {
  email_account_id: string;
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  subject: string;
  body_text?: string;
  body_html: string;
  reply_to_message_id?: string;
  thread_id?: string;
  is_reply_all?: boolean;
  is_forward?: boolean;
  attachments?: Array<{
    filename: string;
    mime_type: string;
    content_bytes_base64: string;
    is_inline?: boolean;
    content_id?: string;
  }>;
}
