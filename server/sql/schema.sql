-- kakukaku 数据库 schema
-- 由 server/migrate.ts 执行，全部 IF NOT EXISTS 以保证可重复执行

CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  username      VARCHAR(40)  NOT NULL UNIQUE,
  email         VARCHAR(120),
  password_hash TEXT         NOT NULL,
  avatar_letter VARCHAR(2)   NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

CREATE TABLE IF NOT EXISTS campaigns (
  id                   TEXT        PRIMARY KEY,
  creator_id           BIGINT      REFERENCES users(id) ON DELETE SET NULL,
  creator_name         VARCHAR(60) NOT NULL,
  creator_avatar       VARCHAR(2)  NOT NULL DEFAULT '',
  title                VARCHAR(160) NOT NULL,
  category             VARCHAR(60) NOT NULL,
  summary              VARCHAR(280) NOT NULL,
  cover                TEXT         NOT NULL,
  goal_tokens          BIGINT       NOT NULL CHECK (goal_tokens > 0),
  raised_tokens        BIGINT       NOT NULL DEFAULT 0,
  backers              INTEGER      NOT NULL DEFAULT 0,
  days_left            INTEGER      NOT NULL DEFAULT 30,
  tags                 TEXT[]       NOT NULL DEFAULT '{}',
  description          TEXT         NOT NULL DEFAULT '',
  token_plan           JSONB        NOT NULL DEFAULT '[]'::jsonb,
  perks                JSONB        NOT NULL DEFAULT '[]'::jsonb,
  milestones           JSONB        NOT NULL DEFAULT '[]'::jsonb,
  cost_saving_percent  INTEGER      NOT NULL DEFAULT 38,
  status               VARCHAR(20)  NOT NULL DEFAULT 'live',
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaigns_creator_idx ON campaigns (creator_id);
CREATE INDEX IF NOT EXISTS campaigns_status_idx  ON campaigns (status);

CREATE TABLE IF NOT EXISTS pledges (
  id            BIGSERIAL PRIMARY KEY,
  campaign_id   TEXT       NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id       BIGINT     NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  tier_id       TEXT       NOT NULL,
  tier_name     VARCHAR(60) NOT NULL,
  tokens        BIGINT     NOT NULL CHECK (tokens > 0),
  out_trade_no  VARCHAR(64) UNIQUE,
  source        VARCHAR(16) NOT NULL DEFAULT 'order',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pledges_campaign_idx ON pledges (campaign_id);
CREATE INDEX IF NOT EXISTS pledges_user_idx     ON pledges (user_id);
CREATE INDEX IF NOT EXISTS pledges_trade_idx    ON pledges (out_trade_no);

ALTER TABLE pledges ADD COLUMN IF NOT EXISTS out_trade_no VARCHAR(64);
ALTER TABLE pledges ADD COLUMN IF NOT EXISTS source VARCHAR(16) NOT NULL DEFAULT 'order';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pledges_out_trade_no_key'
  ) THEN
    ALTER TABLE pledges ADD CONSTRAINT pledges_out_trade_no_key UNIQUE (out_trade_no);
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS orders (
  id              BIGSERIAL PRIMARY KEY,
  out_trade_no    VARCHAR(64) NOT NULL UNIQUE,
  user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id     TEXT        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tier_id         TEXT        NOT NULL,
  tier_name       VARCHAR(60) NOT NULL,
  tokens          BIGINT      NOT NULL CHECK (tokens > 0),
  amount_cents    INTEGER     NOT NULL CHECK (amount_cents > 0),
  currency        VARCHAR(8)  NOT NULL DEFAULT 'CNY',
  provider        VARCHAR(16) NOT NULL DEFAULT 'alipay',
  status          VARCHAR(16) NOT NULL DEFAULT 'pending',
  reconciled      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS orders_user_idx     ON orders (user_id);
CREATE INDEX IF NOT EXISTS orders_campaign_idx ON orders (campaign_id);
CREATE INDEX IF NOT EXISTS orders_status_idx   ON orders (status);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS reconciled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS closed_at   TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reason TEXT;

ALTER TABLE pledges ADD COLUMN IF NOT EXISTS refunded     BOOLEAN     NOT NULL DEFAULT FALSE;
ALTER TABLE pledges ADD COLUMN IF NOT EXISTS refunded_at  TIMESTAMPTZ;
ALTER TABLE pledges ADD COLUMN IF NOT EXISTS order_id     BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pledges_order_id_fkey'
  ) THEN
    ALTER TABLE pledges
      ADD CONSTRAINT pledges_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS pledges_order_idx    ON pledges (order_id);
CREATE INDEX IF NOT EXISTS pledges_campaign_user_idx ON pledges (campaign_id, user_id);

CREATE TABLE IF NOT EXISTS refund_attempts (
  id                BIGSERIAL PRIMARY KEY,
  out_refund_no     VARCHAR(64)  NOT NULL UNIQUE,
  order_id          BIGINT       NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  out_trade_no      VARCHAR(64)  NOT NULL,
  user_id           BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id       TEXT         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  provider          VARCHAR(16)  NOT NULL,
  amount_cents      INTEGER      NOT NULL CHECK (amount_cents > 0),
  status            VARCHAR(16)  NOT NULL DEFAULT 'pending',
  reason            TEXT,
  provider_refund_id VARCHAR(64),
  provider_response JSONB,
  error_message     TEXT,
  requested_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  settled_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS refund_attempts_order_idx    ON refund_attempts (order_id);
CREATE INDEX IF NOT EXISTS refund_attempts_user_idx     ON refund_attempts (user_id);
CREATE INDEX IF NOT EXISTS refund_attempts_status_idx   ON refund_attempts (status);
