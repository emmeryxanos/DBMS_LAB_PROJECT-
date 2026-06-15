CREATE TABLE DrugInteraction (
    interaction_id  SERIAL      PRIMARY KEY,
    medicine1_id    INT         NOT NULL REFERENCES Medicine(medicine_id) ON DELETE CASCADE,
    medicine2_id    INT         NOT NULL REFERENCES Medicine(medicine_id) ON DELETE CASCADE,
    severity        VARCHAR(10) NOT NULL CHECK (severity IN ('mild','moderate','severe')),
    warning_message TEXT        NOT NULL,
 
    CONSTRAINT no_self_interaction CHECK (medicine1_id <> medicine2_id),
    CONSTRAINT unique_drug_pair    UNIQUE (medicine1_id, medicine2_id)
);
