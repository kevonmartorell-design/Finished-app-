-- ══════════════════════════════════════════════════════════════════
-- AEGIS Platform — Initial Database Schema
-- Run this in the Supabase SQL Editor to set up all tables.
-- ══════════════════════════════════════════════════════════════════

-- ── PROFILES ─────────────────────────────────────────────────────

CREATE TABLE profiles (
  id                          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                       TEXT NOT NULL,
  name                        TEXT,
  plan                        TEXT CHECK (plan IN ('solo', 'business')) DEFAULT 'solo',
  stripe_customer_id          TEXT,
  stripe_subscription_id      TEXT,
  stripe_connect_account_id   TEXT,
  subscription_status         TEXT CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled')) DEFAULT 'trialing',
  walkthrough_completed       BOOLEAN DEFAULT FALSE,
  avatar_url                  TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ── ORGANIZATIONS ────────────────────────────────────────────────

CREATE TABLE organizations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id              UUID REFERENCES profiles(id),
  name                  TEXT NOT NULL,
  logo_url              TEXT,
  employee_count_range  TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owners can do everything"
  ON organizations FOR ALL
  USING (auth.uid() = owner_id);

CREATE POLICY "Org members can read their org"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()
        AND organization_members.status = 'active'
    )
  );


-- ── ORGANIZATION MEMBERS ─────────────────────────────────────────

CREATE TABLE organization_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES profiles(id),
  role              TEXT CHECK (role IN ('owner', 'manager', 'employee')) DEFAULT 'employee',
  hourly_rate       DECIMAL(10, 2),
  department_id     UUID,
  invite_email      TEXT,
  invite_token      TEXT UNIQUE,
  status            TEXT CHECK (status IN ('pending', 'active', 'inactive')) DEFAULT 'pending',
  invited_at        TIMESTAMPTZ DEFAULT NOW(),
  joined_at         TIMESTAMPTZ
);

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owners/managers can manage members"
  ON organization_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members AS om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'manager')
        AND om.status = 'active'
    )
  );

CREATE POLICY "Members can read own membership"
  ON organization_members FOR SELECT
  USING (auth.uid() = user_id);

-- Allow reading by invite token (for invite acceptance before auth)
CREATE POLICY "Anyone can read by invite token"
  ON organization_members FOR SELECT
  USING (invite_token IS NOT NULL AND status = 'pending');


-- ── DEPARTMENTS ──────────────────────────────────────────────────

CREATE TABLE departments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  location                TEXT,
  geofence_lat            DECIMAL(10, 7),
  geofence_lng            DECIMAL(10, 7),
  geofence_radius_meters  INTEGER DEFAULT 200
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read departments"
  ON departments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = departments.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.status = 'active'
    )
  );

CREATE POLICY "Org owners/managers can manage departments"
  ON departments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = departments.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'manager')
        AND organization_members.status = 'active'
    )
  );

-- Add FK from organization_members.department_id to departments
ALTER TABLE organization_members
  ADD CONSTRAINT fk_member_department
  FOREIGN KEY (department_id) REFERENCES departments(id);


-- ── SERVICES ─────────────────────────────────────────────────────

CREATE TABLE services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  duration_minutes  INTEGER,
  price             DECIMAL(10, 2),
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own services"
  ON services FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Public can read active services"
  ON services FOR SELECT
  USING (is_active = TRUE);


-- ── BOOKING PAGES ────────────────────────────────────────────────

CREATE TABLE booking_pages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  username          TEXT UNIQUE NOT NULL,
  bio               TEXT,
  is_active         BOOLEAN DEFAULT TRUE,
  intro_questions   JSONB DEFAULT '[]',
  timezone          TEXT DEFAULT 'America/New_York'
);

ALTER TABLE booking_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own booking page"
  ON booking_pages FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Public can read active booking pages"
  ON booking_pages FOR SELECT
  USING (is_active = TRUE);


-- ── CLIENTS ──────────────────────────────────────────────────────

CREATE TABLE clients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  notes             TEXT,
  sms_opt_out       BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own clients"
  ON clients FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Org members can manage org clients"
  ON clients FOR ALL
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = clients.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.status = 'active'
    )
  );


-- ── APPOINTMENTS ─────────────────────────────────────────────────

CREATE TABLE appointments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE,
  client_id         UUID REFERENCES clients(id),
  service_id        UUID REFERENCES services(id),
  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ NOT NULL,
  status            TEXT CHECK (status IN ('pending', 'confirmed', 'canceled', 'completed')) DEFAULT 'pending',
  notes             TEXT,
  intake_answers    JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own appointments"
  ON appointments FOR ALL
  USING (auth.uid() = user_id);


-- ── INVOICES ─────────────────────────────────────────────────────

CREATE TABLE invoices (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  client_id                 UUID REFERENCES clients(id),
  invoice_number            TEXT UNIQUE NOT NULL,
  status                    TEXT CHECK (status IN ('draft', 'sent', 'paid', 'overdue')) DEFAULT 'draft',
  subtotal                  DECIMAL(10, 2),
  tax_rate                  DECIMAL(5, 2) DEFAULT 0,
  tax_amount                DECIMAL(10, 2) DEFAULT 0,
  total                     DECIMAL(10, 2),
  due_date                  DATE,
  paid_at                   TIMESTAMPTZ,
  stripe_payment_intent_id  TEXT,
  pdf_url                   TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own invoices"
  ON invoices FOR ALL
  USING (auth.uid() = user_id);


-- ── INVOICE ITEMS ────────────────────────────────────────────────

CREATE TABLE invoice_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  quantity      DECIMAL(10, 2) DEFAULT 1,
  unit_price    DECIMAL(10, 2),
  amount        DECIMAL(10, 2)
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own invoice items"
  ON invoice_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
        AND invoices.user_id = auth.uid()
    )
  );


-- ── CONTRACTS ────────────────────────────────────────────────────

CREATE TABLE contracts (
  id                                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                             UUID REFERENCES profiles(id) ON DELETE CASCADE,
  client_id                           UUID REFERENCES clients(id),
  title                               TEXT NOT NULL,
  body                                TEXT,
  status                              TEXT CHECK (status IN ('draft', 'sent', 'signed', 'expired')) DEFAULT 'draft',
  dropboxsign_signature_request_id    TEXT,
  signed_at                           TIMESTAMPTZ,
  pdf_url                             TEXT,
  created_at                          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own contracts"
  ON contracts FOR ALL
  USING (auth.uid() = user_id);


-- ── EXPENSES ─────────────────────────────────────────────────────

CREATE TABLE expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category      TEXT,
  description   TEXT,
  amount        DECIMAL(10, 2) NOT NULL,
  date          DATE DEFAULT CURRENT_DATE,
  receipt_url   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own expenses"
  ON expenses FOR ALL
  USING (auth.uid() = user_id);


-- ── RETAINERS ────────────────────────────────────────────────────

CREATE TABLE retainers (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  client_id                 UUID REFERENCES clients(id),
  name                      TEXT NOT NULL,
  amount                    DECIMAL(10, 2),
  billing_period            TEXT CHECK (billing_period IN ('weekly', 'monthly')),
  stripe_subscription_id    TEXT,
  status                    TEXT CHECK (status IN ('active', 'paused', 'canceled')) DEFAULT 'active'
);

ALTER TABLE retainers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own retainers"
  ON retainers FOR ALL
  USING (auth.uid() = user_id);


-- ── SHIFTS ───────────────────────────────────────────────────────

CREATE TABLE shifts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  member_id         UUID REFERENCES organization_members(id),
  department_id     UUID REFERENCES departments(id),
  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ NOT NULL,
  role              TEXT,
  status            TEXT CHECK (status IN ('draft', 'published', 'swap_requested')) DEFAULT 'draft',
  notes             TEXT
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read shifts in their org"
  ON shifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = shifts.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.status = 'active'
    )
  );

CREATE POLICY "Org owners/managers can manage shifts"
  ON shifts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = shifts.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'manager')
        AND organization_members.status = 'active'
    )
  );


-- ── TIMESHEETS ───────────────────────────────────────────────────

CREATE TABLE timesheets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  member_id         UUID REFERENCES organization_members(id),
  shift_id          UUID REFERENCES shifts(id),
  clock_in_time     TIMESTAMPTZ,
  clock_out_time    TIMESTAMPTZ,
  clock_in_lat      DECIMAL(10, 7),
  clock_in_lng      DECIMAL(10, 7),
  is_approved       BOOLEAN DEFAULT FALSE,
  approved_by       UUID REFERENCES profiles(id),
  notes             TEXT
);

ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage own timesheets"
  ON timesheets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.id = timesheets.member_id
        AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Org owners/managers can manage all timesheets"
  ON timesheets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = timesheets.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'manager')
        AND organization_members.status = 'active'
    )
  );


-- ── TASKS ────────────────────────────────────────────────────────

CREATE TABLE tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_to       UUID REFERENCES organization_members(id),
  assigned_by       UUID REFERENCES profiles(id),
  title             TEXT NOT NULL,
  description       TEXT,
  due_date          DATE,
  status            TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')) DEFAULT 'pending',
  priority          TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read tasks in their org"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = tasks.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.status = 'active'
    )
  );

CREATE POLICY "Org owners/managers can manage tasks"
  ON tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = tasks.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'manager')
        AND organization_members.status = 'active'
    )
  );

CREATE POLICY "Assigned members can update own tasks"
  ON tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.id = tasks.assigned_to
        AND organization_members.user_id = auth.uid()
    )
  );


-- ── CONVERSATIONS ────────────────────────────────────────────────

CREATE TABLE conversations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id),
  type              TEXT CHECK (type IN ('dm', 'channel', 'announcement', 'client')) NOT NULL,
  name              TEXT,
  client_id         UUID REFERENCES clients(id),
  created_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation members can read conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = conversations.id
        AND conversation_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);


-- ── CONVERSATION MEMBERS ─────────────────────────────────────────

CREATE TABLE conversation_members (
  conversation_id   UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at         TIMESTAMPTZ DEFAULT NOW(),
  is_muted          BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read own memberships"
  ON conversation_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Conversation creators can add members"
  ON conversation_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_members.conversation_id
        AND conversations.created_by = auth.uid()
    )
  );


-- ── MESSAGES ─────────────────────────────────────────────────────

CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id         UUID REFERENCES profiles(id),
  body              TEXT NOT NULL,
  read_by           UUID[] DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation members can read messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = messages.conversation_id
        AND conversation_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = messages.conversation_id
        AND conversation_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Senders can update own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id);


-- ── IN-APP NOTIFICATIONS ────────────────────────────────────────

CREATE TABLE in_app_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT,
  data          JSONB DEFAULT '{}',
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON in_app_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON in_app_notifications FOR UPDATE
  USING (auth.uid() = user_id);


-- ── DEVICE TOKENS ────────────────────────────────────────────────

CREATE TABLE device_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  token         TEXT NOT NULL,
  platform      TEXT CHECK (platform IN ('ios', 'android', 'web')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, token)
);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own device tokens"
  ON device_tokens FOR ALL
  USING (auth.uid() = user_id);


-- ── NOTIFICATION PREFERENCES ─────────────────────────────────────

CREATE TABLE notification_preferences (
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,
  push_enabled    BOOLEAN DEFAULT TRUE,
  email_enabled   BOOLEAN DEFAULT TRUE,
  sms_enabled     BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (user_id, category)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id);


-- ── AUDIT LOGS ───────────────────────────────────────────────────

CREATE TABLE audit_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id          UUID REFERENCES profiles(id),
  action            TEXT NOT NULL,
  resource_type     TEXT,
  resource_id       UUID,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owners/managers can read audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = audit_logs.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'manager')
        AND organization_members.status = 'active'
    )
  );

-- Insert-only for the system (via service role key on the backend)
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (TRUE);


-- ── WAITLIST ─────────────────────────────────────────────────────

CREATE TABLE waitlist (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Waitlist is insert-only from the public (anon key)
CREATE POLICY "Anyone can join waitlist"
  ON waitlist FOR INSERT
  WITH CHECK (TRUE);

-- Only service role can read waitlist entries
CREATE POLICY "Service role can read waitlist"
  ON waitlist FOR SELECT
  USING (FALSE);


-- ══════════════════════════════════════════════════════════════════
-- SUPABASE STORAGE BUCKETS
-- ══════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', TRUE),
  ('logos', 'logos', TRUE),
  ('receipts', 'receipts', FALSE),
  ('contract-pdfs', 'contract-pdfs', FALSE),
  ('invoice-pdfs', 'invoice-pdfs', FALSE);

-- ── Storage Policies: avatars (public) ───────────────────────────

CREATE POLICY "Anyone can read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── Storage Policies: logos (public) ─────────────────────────────

CREATE POLICY "Anyone can read logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "Users can upload own logo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own logo"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own logo"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── Storage Policies: receipts (private) ─────────────────────────

CREATE POLICY "Users can read own receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own receipts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── Storage Policies: contract-pdfs (private) ────────────────────

CREATE POLICY "Users can read own contract PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'contract-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own contract PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'contract-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own contract PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'contract-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── Storage Policies: invoice-pdfs (private) ─────────────────────

CREATE POLICY "Users can read own invoice PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'invoice-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own invoice PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'invoice-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own invoice PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'invoice-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ══════════════════════════════════════════════════════════════════
-- INDEXES FOR PERFORMANCE
-- ══════════════════════════════════════════════════════════════════

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_invite ON organization_members(invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX idx_services_user ON services(user_id);
CREATE INDEX idx_clients_user ON clients(user_id);
CREATE INDEX idx_clients_org ON clients(organization_id);
CREATE INDEX idx_appointments_user ON appointments(user_id);
CREATE INDEX idx_appointments_start ON appointments(start_time);
CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_contracts_user ON contracts(user_id);
CREATE INDEX idx_expenses_user ON expenses(user_id);
CREATE INDEX idx_shifts_org ON shifts(organization_id);
CREATE INDEX idx_shifts_member ON shifts(member_id);
CREATE INDEX idx_timesheets_org ON timesheets(organization_id);
CREATE INDEX idx_timesheets_member ON timesheets(member_id);
CREATE INDEX idx_tasks_org ON tasks(organization_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_conv_members_user ON conversation_members(user_id);
CREATE INDEX idx_notifications_user ON in_app_notifications(user_id);
CREATE INDEX idx_notifications_unread ON in_app_notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);
