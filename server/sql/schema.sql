-- kakukaku 数据库 schema
-- 由 server/migrate.ts 执行，全部 IF NOT EXISTS 以保证可重复执行

CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  username      VARCHAR(40)  NOT NULL UNIQUE,
  email         VARCHAR(120),
  password_hash TEXT         NOT NULL,
  avatar_letter VARCHAR(2)  NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

-- 账号管理扩展(2026-07)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url              TEXT        NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio                     TEXT        NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_updated_at    TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at              TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at              TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS delete_scheduled_at     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS users_deleted_idx ON users (deleted_at);

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

-- 创作者作品表
CREATE TABLE IF NOT EXISTS videos (
  id            BIGSERIAL   PRIMARY KEY,
  creator_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(160) NOT NULL,
  description   TEXT         NOT NULL DEFAULT '',
  category      VARCHAR(60)  NOT NULL DEFAULT '动画',
  tags          TEXT[]       NOT NULL DEFAULT '{}',
  cover         TEXT         NOT NULL DEFAULT '',
  video_src     TEXT         NOT NULL DEFAULT '',
  embed_url     TEXT         NOT NULL DEFAULT '',
  duration      VARCHAR(16)  NOT NULL DEFAULT '00:00',
  status        VARCHAR(20)  NOT NULL DEFAULT 'draft',   -- draft / pending / published / rejected
  views         BIGINT       NOT NULL DEFAULT 0,
  likes         BIGINT       NOT NULL DEFAULT 0,
  danmaku_count BIGINT       NOT NULL DEFAULT 0,
  reject_reason TEXT,
  scheduled_at  TIMESTAMPTZ,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS videos_creator_idx ON videos (creator_id);
CREATE INDEX IF NOT EXISTS videos_status_idx  ON videos (status);

-- =========================================================
-- 创作中心 v1 扩展(2026-07)
-- =========================================================

-- 1) videos 扩展字段
ALTER TABLE videos ADD COLUMN IF NOT EXISTS content_type VARCHAR(20) NOT NULL DEFAULT 'video';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS subtitle_url TEXT NOT NULL DEFAULT '';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS pinned BOOLEAN     NOT NULL DEFAULT FALSE;

-- 2) 评论(创作者可审核)
CREATE TABLE IF NOT EXISTS comments (
  id            BIGSERIAL   PRIMARY KEY,
  video_id      BIGINT      NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id       BIGINT      NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  author_name   VARCHAR(40) NOT NULL,
  avatar_letter VARCHAR(2)  NOT NULL DEFAULT '',
  content       TEXT        NOT NULL,
  status        VARCHAR(16) NOT NULL DEFAULT 'visible',  -- visible | hidden | pinned
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_video_idx  ON comments (video_id);
CREATE INDEX IF NOT EXISTS comments_user_idx   ON comments (user_id);
CREATE INDEX IF NOT EXISTS comments_status_idx ON comments (video_id, status);

-- 3) 弹幕
CREATE TABLE IF NOT EXISTS danmaku (
  id            BIGSERIAL   PRIMARY KEY,
  video_id      BIGINT      NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id       BIGINT      NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  author_name   VARCHAR(40) NOT NULL,
  text          VARCHAR(200) NOT NULL,
  mode          VARCHAR(10) NOT NULL DEFAULT 'scroll',   -- scroll | top | bottom
  color         VARCHAR(10) NOT NULL DEFAULT '#ffffff',
  time_seconds  INTEGER     NOT NULL DEFAULT 0,
  hidden        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS danmaku_video_idx ON danmaku (video_id, time_seconds);
CREATE INDEX IF NOT EXISTS danmaku_user_idx  ON danmaku (user_id);

-- 4) 关注关系(粉丝 -> 创作者)
CREATE TABLE IF NOT EXISTS follows (
  follower_id  BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id   BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, creator_id),
  CHECK (follower_id <> creator_id)
);
CREATE INDEX IF NOT EXISTS follows_creator_idx ON follows (creator_id);

-- 5) 创作者聚合统计
CREATE TABLE IF NOT EXISTS creator_stats (
  user_id        BIGINT   PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  follower_count BIGINT   NOT NULL DEFAULT 0,
  total_views    BIGINT   NOT NULL DEFAULT 0,
  total_likes    BIGINT   NOT NULL DEFAULT 0,
  total_danmaku  BIGINT   NOT NULL DEFAULT 0,
  total_revenue  INTEGER  NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) 收益流水(模拟)
CREATE TABLE IF NOT EXISTS revenue_entries (
  id           BIGSERIAL   PRIMARY KEY,
  user_id      BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source       VARCHAR(20) NOT NULL,                     -- views | charging | brand | activity
  amount_cents INTEGER     NOT NULL,
  memo         TEXT        NOT NULL DEFAULT '',
  occurred_on  DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS revenue_user_idx ON revenue_entries (user_id, occurred_on DESC);

-- 7) 任务(Growth)
CREATE TABLE IF NOT EXISTS missions (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code        VARCHAR(40) NOT NULL,
  title       VARCHAR(120) NOT NULL,
  reward_text VARCHAR(120) NOT NULL,
  progress    INTEGER     NOT NULL DEFAULT 0,
  target      INTEGER     NOT NULL DEFAULT 1,
  status      VARCHAR(16) NOT NULL DEFAULT 'active',    -- active | done | claimed
  expires_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
CREATE INDEX IF NOT EXISTS missions_user_idx ON missions (user_id, status);

-- 8) 创作者权益
CREATE TABLE IF NOT EXISTS rights_grants (
  id         BIGSERIAL   PRIMARY KEY,
  user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code       VARCHAR(40) NOT NULL,
  title      VARCHAR(120) NOT NULL,
  detail     TEXT        NOT NULL,
  enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
CREATE INDEX IF NOT EXISTS rights_user_idx ON rights_grants (user_id);

-- =========================================================
-- IP 共创社区（Reddit 模式）
-- =========================================================

-- 社区本体：一个 IP、创作主题或创作者小组对应一个社区。
CREATE TABLE IF NOT EXISTS communities (
  id              BIGSERIAL PRIMARY KEY,
  slug            VARCHAR(48)  NOT NULL UNIQUE,
  name            VARCHAR(60)  NOT NULL,
  description     VARCHAR(280) NOT NULL,
  category        VARCHAR(32)  NOT NULL,
  icon_text       VARCHAR(4)   NOT NULL DEFAULT '',
  accent          TEXT         NOT NULL DEFAULT '',
  banner          TEXT         NOT NULL DEFAULT '',
  creator_id      BIGINT       REFERENCES users(id) ON DELETE SET NULL,
  member_count    BIGINT       NOT NULL DEFAULT 0 CHECK (member_count >= 0),
  post_count      BIGINT       NOT NULL DEFAULT 0 CHECK (post_count >= 0),
  is_featured     BOOLEAN      NOT NULL DEFAULT FALSE,
  is_archived     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS communities_category_idx ON communities (category, created_at DESC);
CREATE INDEX IF NOT EXISTS communities_featured_idx ON communities (is_featured, created_at DESC);
CREATE INDEX IF NOT EXISTS communities_creator_idx ON communities (creator_id);

-- 成员关系：角色可以扩展为 member / moderator / owner。
CREATE TABLE IF NOT EXISTS community_members (
  community_id    BIGINT       NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            VARCHAR(16)  NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'owner')),
  joined_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);
CREATE INDEX IF NOT EXISTS community_members_user_idx ON community_members (user_id, joined_at DESC);

-- 共创讨论帖。adoption_status 为创作者采纳流转提供结构化状态。
CREATE TABLE IF NOT EXISTS community_posts (
  id                BIGSERIAL PRIMARY KEY,
  community_id      BIGINT       NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             VARCHAR(160) NOT NULL,
  body              TEXT         NOT NULL,
  category          VARCHAR(32)  NOT NULL DEFAULT '灵感征集',
  tags              TEXT[]       NOT NULL DEFAULT '{}',
  status            VARCHAR(16)  NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'locked', 'deleted')),
  is_pinned         BOOLEAN      NOT NULL DEFAULT FALSE,
  is_featured       BOOLEAN      NOT NULL DEFAULT FALSE,
  adoption_status   VARCHAR(24)  NOT NULL DEFAULT 'none' CHECK (adoption_status IN ('none', 'reviewing', 'adopted', 'in_production', 'declined')),
  adoption_note     TEXT         NOT NULL DEFAULT '',
  vote_score        INTEGER      NOT NULL DEFAULT 0,
  comment_count     INTEGER      NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
  view_count        BIGINT       NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_posts_feed_idx ON community_posts (community_id, status, is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_hot_idx ON community_posts (community_id, status, vote_score DESC, comment_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_author_idx ON community_posts (author_id, created_at DESC);

-- 每位成员对每个帖子最多保留一票；direction=1/-1。
CREATE TABLE IF NOT EXISTS community_post_votes (
  post_id         BIGINT      NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction       SMALLINT    NOT NULL CHECK (direction IN (-1, 1)),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS community_post_votes_user_idx ON community_post_votes (user_id, updated_at DESC);

-- 嵌套评论。parent_id 为空时是一级评论；应用层保证父评论属于同一帖子。
CREATE TABLE IF NOT EXISTS community_comments (
  id              BIGSERIAL PRIMARY KEY,
  post_id         BIGINT      NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  parent_id       BIGINT      REFERENCES community_comments(id) ON DELETE CASCADE,
  author_id       BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            TEXT        NOT NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'deleted')),
  vote_score      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_comments_post_idx ON community_comments (post_id, status, created_at ASC);
CREATE INDEX IF NOT EXISTS community_comments_parent_idx ON community_comments (parent_id, created_at ASC);
CREATE INDEX IF NOT EXISTS community_comments_author_idx ON community_comments (author_id, created_at DESC);

-- =========================================================
-- Reddit Thing 模型（社区内容 v2）
-- 旧 community_posts / community_comments 保留为兼容层；新写入走下列 Thing 表。
-- =========================================================

-- 所有可互动对象的统一根表。post 与 comment 共用同一 ID、作者、分数和可见性。
CREATE TABLE IF NOT EXISTS community_things (
  id                BIGSERIAL PRIMARY KEY,
  fullname          VARCHAR(32) UNIQUE,
  kind              VARCHAR(12) NOT NULL CHECK (kind IN ('post', 'comment')),
  community_id      BIGINT      NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_thing_id   BIGINT      REFERENCES community_things(id) ON DELETE CASCADE,
  root_post_id      BIGINT      REFERENCES community_things(id) ON DELETE CASCADE,
  depth             SMALLINT    NOT NULL DEFAULT 0 CHECK (depth >= 0 AND depth <= 64),
  -- 每段固定 13 位，按 path 排序即可得到稳定的深度优先评论树；支持 prefix 范围查询。
  tree_path         TEXT        NOT NULL DEFAULT '',
  score             INTEGER     NOT NULL DEFAULT 0,
  comment_count     INTEGER     NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
  child_count       INTEGER     NOT NULL DEFAULT 0 CHECK (child_count >= 0),
  status            VARCHAR(16) NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'locked', 'deleted')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (kind = 'post' AND parent_thing_id IS NULL AND depth = 0)
    OR (kind = 'comment' AND parent_thing_id IS NOT NULL AND depth > 0)
  )
);
CREATE INDEX IF NOT EXISTS community_things_feed_idx ON community_things (community_id, kind, status, score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS community_things_author_idx ON community_things (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_things_parent_idx ON community_things (parent_thing_id, status, score DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS community_things_tree_idx ON community_things (root_post_id, tree_path text_pattern_ops);

-- 帖子特有字段。Thing ID 同时就是帖子 ID（类似 Reddit 的 t3）。
CREATE TABLE IF NOT EXISTS community_post_things (
  thing_id          BIGINT       PRIMARY KEY REFERENCES community_things(id) ON DELETE CASCADE,
  title             VARCHAR(160) NOT NULL,
  body              TEXT         NOT NULL,
  category          VARCHAR(32)  NOT NULL DEFAULT '灵感征集',
  tags              TEXT[]       NOT NULL DEFAULT '{}',
  is_pinned         BOOLEAN      NOT NULL DEFAULT FALSE,
  is_featured       BOOLEAN      NOT NULL DEFAULT FALSE,
  adoption_status   VARCHAR(24)  NOT NULL DEFAULT 'none' CHECK (adoption_status IN ('none', 'reviewing', 'adopted', 'in_production', 'declined')),
  adoption_note     TEXT         NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS community_post_things_category_idx ON community_post_things (category);

-- 评论特有字段；parent_thing_id 与 tree_path 都在 community_things，避免树信息分散。
CREATE TABLE IF NOT EXISTS community_comment_things (
  thing_id          BIGINT      PRIMARY KEY REFERENCES community_things(id) ON DELETE CASCADE,
  body              TEXT        NOT NULL
);

-- 对任意 Thing（帖子或评论）的唯一投票。缓存分数维护在 community_things.score。
CREATE TABLE IF NOT EXISTS community_thing_votes (
  thing_id          BIGINT      NOT NULL REFERENCES community_things(id) ON DELETE CASCADE,
  user_id           BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction         SMALLINT    NOT NULL CHECK (direction IN (-1, 1)),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thing_id, user_id)
);
CREATE INDEX IF NOT EXISTS community_thing_votes_user_idx ON community_thing_votes (user_id, updated_at DESC);

-- =========================================================
-- 钱包/酷币充值(2026-07)
-- =========================================================

-- 1) 钱包余额(每用户一行)
CREATE TABLE IF NOT EXISTS wallet_balances (
  user_id          BIGINT       PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance_tokens   BIGINT       NOT NULL DEFAULT 0 CHECK (balance_tokens >= 0),
  total_recharged  BIGINT       NOT NULL DEFAULT 0,
  total_consumed   BIGINT       NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 2) 充值订单(独立于众筹 orders，单独的 product kind)
CREATE TABLE IF NOT EXISTS recharge_orders (
  id              BIGSERIAL   PRIMARY KEY,
  out_trade_no    VARCHAR(64) NOT NULL UNIQUE,
  user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id      VARCHAR(32) NOT NULL,
  tokens          BIGINT      NOT NULL CHECK (tokens > 0),
  bonus_tokens    BIGINT      NOT NULL DEFAULT 0,
  total_tokens    BIGINT      NOT NULL,
  amount_cents    INTEGER     NOT NULL CHECK (amount_cents > 0),
  currency        VARCHAR(8)  NOT NULL DEFAULT 'CNY',
  provider        VARCHAR(16) NOT NULL DEFAULT 'alipay',
  status          VARCHAR(16) NOT NULL DEFAULT 'pending',
  reconciled      BOOLEAN     NOT NULL DEFAULT FALSE,
  paid_at         TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  refunded_at     TIMESTAMPTZ,
  refund_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recharge_orders_user_idx   ON recharge_orders (user_id);
CREATE INDEX IF NOT EXISTS recharge_orders_status_idx ON recharge_orders (status);

-- 3) 钱包流水(充值入账 / 后续消费预留)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id              BIGSERIAL   PRIMARY KEY,
  user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  out_trade_no    VARCHAR(64),
  kind            VARCHAR(16) NOT NULL,           -- recharge | consume | bonus | refund | adjust
  tokens          BIGINT      NOT NULL,           -- 正负值均可，负数=扣减
  memo            TEXT        NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wallet_tx_user_idx ON wallet_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wallet_tx_trade_idx ON wallet_transactions (out_trade_no) WHERE out_trade_no IS NOT NULL;
