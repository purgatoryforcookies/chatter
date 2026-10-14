-- Up Migration

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'normal',
    created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    banned TIMESTAMPTZ DEFAULT NULL

);

CREATE TABLE IF NOT EXISTS room (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    private BOOLEAN NOT NULL DEFAULT TRUE,
    created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    owner TEXT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS message (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    room UUID NOT NULL REFERENCES room(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permission (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    room UUID NOT NULL REFERENCES room(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO users (id, username, type)
VALUES ('system', 'system', 'system')
ON CONFLICT DO NOTHING;


INSERT INTO room (id, name, description, private, owner)
VALUES ('8902e286-3791-4896-b7bd-04bdd61694a7', 'General', '-', false, 'system'),
('3da62c01-e52e-4616-aa50-cd8147e9ae31', 'Offtopic', '-', false, 'system')
ON CONFLICT DO NOTHING;

-- Down Migration