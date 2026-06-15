CREATE TABLE Disease (
    disease_id   SERIAL       PRIMARY KEY,
    disease_name VARCHAR(100) NOT NULL UNIQUE,
    severity     VARCHAR(10)  NOT NULL CHECK (severity IN ('mild','moderate','severe')),
    description  TEXT
);
