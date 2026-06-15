CREATE TABLE AuditLog (
    audit_id   SERIAL      PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    operation  VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
    record_id  INT         NOT NULL,
    old_value  TEXT,
    new_value  TEXT,
    changed_at TIMESTAMP   DEFAULT NOW()
);
