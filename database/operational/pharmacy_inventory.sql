CREATE TABLE PharmacyInventory (
    inventory_id SERIAL    PRIMARY KEY,
    medicine_id  INT       NOT NULL REFERENCES Medicine(medicine_id) ON DELETE CASCADE,
    stock        INT       NOT NULL DEFAULT 0 CHECK (stock >= 0),
    expiry_date  DATE      NOT NULL,
    last_updated TIMESTAMP DEFAULT NOW()
);
