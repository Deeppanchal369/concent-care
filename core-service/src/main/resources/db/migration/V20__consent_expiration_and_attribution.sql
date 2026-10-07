-- V20__consent_expiration_and_attribution.sql
-- Record attribution for who granted or revoked consent, and index on expiration status

ALTER TABLE consents ADD COLUMN IF NOT EXISTS granted_by VARCHAR(100);
ALTER TABLE consents ADD COLUMN IF NOT EXISTS revoked_by VARCHAR(100);

ALTER TABLE consents_aud ADD COLUMN IF NOT EXISTS granted_by VARCHAR(100);
ALTER TABLE consents_aud ADD COLUMN IF NOT EXISTS revoked_by VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_consents_expires_at_status ON consents(expires_at, status);
CREATE INDEX IF NOT EXISTS idx_consents_granted_by ON consents(granted_by);

