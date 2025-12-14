-- =========================================================
-- 010_schema_core.sql
-- Core tables only (no FKs, no indexes, no RLS, no policies)
-- Execute first
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id       SERIAL PRIMARY KEY,
    email    TEXT NOT NULL,
    name     TEXT,
    auth_uid UUID
);

CREATE TABLE IF NOT EXISTS courses (
    id           SERIAL PRIMARY KEY,
    subject      TEXT NOT NULL,
    number       TEXT NOT NULL,
    title        TEXT NOT NULL,
    instructor   TEXT,
    units        INTEGER,
    status       TEXT,
    meeting_time TEXT
);

CREATE TABLE IF NOT EXISTS schedules (
    id      SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    term    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
    id        SERIAL PRIMARY KEY,
    user_id   INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    rating    INTEGER,
    comment   TEXT
);

CREATE TABLE IF NOT EXISTS sections (
    id             BIGSERIAL PRIMARY KEY,
    course_id      BIGINT NOT NULL,
    term           TEXT NOT NULL,
    instructor     TEXT,
    meeting_time   TEXT,
    status         TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    sec            TEXT,
    class_number   INTEGER,
    component_type TEXT,
    days           TEXT,
    time_range     TEXT,
    location       TEXT,
    open_seats     INTEGER,
    capacity       INTEGER,
    notes          TEXT
);

CREATE TABLE IF NOT EXISTS schedule_items (
    id          BIGSERIAL PRIMARY KEY,
    schedule_id BIGINT NOT NULL,
    section_id  BIGINT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
