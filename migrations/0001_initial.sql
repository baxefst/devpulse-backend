-- ENUMS
CREATE TYPE open_to AS ENUM ('jobs', 'cofounders', 'investment', 'contracts', 'all');
CREATE TYPE category AS ENUM ('SaaS', 'Dev Tool', 'API', 'Mobile', 'Open Source', 'Other');
CREATE TYPE proof_type AS ENUM ('live_link', 'screenshot', 'revenue', 'users', 'github', 'video');
CREATE TYPE milestone_status AS ENUM ('active', 'done', 'missed', 'pending');

-- FUNCTION: set_updated_at()
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TABLE: users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  bio TEXT,
  tech_stack TEXT[],
  open_to open_to,
  github_url TEXT,
  twitter_url TEXT,
  streak INTEGER NOT NULL DEFAULT 0,
  reputation_score NUMERIC(5,1) NOT NULL DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TRIGGER: set_updated_at on users
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- TABLE: drops
CREATE TABLE drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category category NOT NULL,
  tech_stack TEXT[] NOT NULL DEFAULT '{}',
  live_url TEXT,
  emoji TEXT NOT NULL DEFAULT '🚀',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX drops_user_idx ON drops (user_id);

-- TABLE: milestones
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  deadline DATE NOT NULL,
  proof_type proof_type NOT NULL,
  status milestone_status NOT NULL DEFAULT 'active',
  "order" INTEGER NOT NULL DEFAULT 1,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX milestones_drop_idx ON milestones (drop_id);
CREATE INDEX milestones_user_idx ON milestones (user_id);

-- TABLE: proofs
CREATE TABLE proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: refresh_tokens
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
