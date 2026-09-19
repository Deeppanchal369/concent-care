-- V1__initial_schema.sql
-- Core users, clinical roles, departments, and patient profiles

CREATE TABLE departments (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(100) NOT NULL UNIQUE,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'DOCTOR', 'NURSE', 'PATIENT')),
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE doctors (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    specialization  VARCHAR(100) NOT NULL,
    contact_number  VARCHAR(30),
    department_id   BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    license_number  VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE nurses (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    department_id       BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    availability_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (availability_status IN ('AVAILABLE', 'BUSY')),
    contact_number      VARCHAR(30)
);

CREATE TABLE patients (
    id                      BIGSERIAL PRIMARY KEY,
    linked_user_id          BIGINT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    full_name               VARCHAR(150) NOT NULL,
    date_of_birth           DATE,
    gender                  VARCHAR(20),
    phone                   VARCHAR(30),
    email                   VARCHAR(150),
    address                 TEXT,
    emergency_contact       VARCHAR(150),
    blood_group             VARCHAR(10),
    allergies               TEXT,
    chronic_conditions      TEXT,
    medical_history_summary TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_doctors_specialization ON doctors(specialization);
CREATE INDEX idx_nurses_availability ON nurses(availability_status);
CREATE INDEX idx_patients_linked_user ON patients(linked_user_id);
CREATE INDEX idx_patients_full_name ON patients(full_name);

-- Seed core departments
INSERT INTO departments (name, description) VALUES
('Cardiology', 'Cardiovascular disease, heart failure, and hypertension care'),
('Endocrinology', 'Diabetes, metabolic disorders, and hormone therapies'),
('General Medicine', 'Primary adult clinical care and preventive health'),
('Pediatrics', 'Infant, child, and adolescent healthcare');

