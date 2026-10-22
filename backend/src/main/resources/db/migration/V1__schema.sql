-- Nimbus CRM schema, MySQL 8.
--
-- Flyway runs this once, on the first start, and records it in flyway_schema_history.
-- Never edit a migration that has already run: add V3__..., V4__... instead.
-- docs/DATABASE.md explains every key and constraint below, with an ER diagram.
--
-- Conventions
--   * Every table has a surrogate primary key `id` (BIGINT AUTO_INCREMENT). Foreign keys
--     point at it. It never leaves the API.
--   * Business references (A-0001, C-00001, D-00001, U-0001) are what the API and the UI
--     use. Each one is UNIQUE, so it is a candidate key, but it is not the primary key.
--   * Fixed lists of values (roles, statuses, stages, activity types) live in lookup
--     tables, and the tables that use them hold a foreign key to the code. The database
--     itself refuses a stage called 'NEGOTIATIONS'.
--   * Times are stored in UTC.

-- ---------------------------------------------------------------------------------------
-- Lookup tables (reference data, loaded here because the schema is useless without them)
-- ---------------------------------------------------------------------------------------

CREATE TABLE roles (
    code        VARCHAR(20)  NOT NULL,
    description VARCHAR(200) NOT NULL,
    CONSTRAINT pk_roles PRIMARY KEY (code)
) ENGINE = InnoDB;

CREATE TABLE contact_statuses (
    code        VARCHAR(20)  NOT NULL,
    description VARCHAR(200) NOT NULL,
    CONSTRAINT pk_contact_statuses PRIMARY KEY (code)
) ENGINE = InnoDB;

CREATE TABLE activity_types (
    code        VARCHAR(20)  NOT NULL,
    description VARCHAR(200) NOT NULL,
    CONSTRAINT pk_activity_types PRIMARY KEY (code)
) ENGINE = InnoDB;

CREATE TABLE deal_stages (
    code       VARCHAR(20) NOT NULL,
    sort_order TINYINT     NOT NULL,
    is_open    BOOLEAN     NOT NULL,
    CONSTRAINT pk_deal_stages PRIMARY KEY (code),
    CONSTRAINT uq_deal_stages_sort_order UNIQUE (sort_order)
) ENGINE = InnoDB;

INSERT INTO roles (code, description) VALUES
    ('ADMIN', 'Manages accounts, contacts and deals, and assigns deal owners'),
    ('USER',  'Sales rep: reads contacts and accounts, works the deals they own');

INSERT INTO contact_statuses (code, description) VALUES
    ('PROSPECT', 'Not bought anything yet'),
    ('CUSTOMER', 'Currently paying us'),
    ('CHURNED',  'Was a customer, is not any more');

INSERT INTO activity_types (code, description) VALUES
    ('CALL',    'A phone call'),
    ('EMAIL',   'An email sent or received'),
    ('MEETING', 'A meeting, on site or online'),
    ('NOTE',    'An internal note');

INSERT INTO deal_stages (code, sort_order, is_open) VALUES
    ('PROSPECTING', 0, TRUE),
    ('QUALIFIED',   1, TRUE),
    ('PROPOSAL',    2, TRUE),
    ('NEGOTIATION', 3, TRUE),
    ('WON',         4, FALSE),
    ('LOST',        5, FALSE);

-- ---------------------------------------------------------------------------------------
-- People who can sign in
-- ---------------------------------------------------------------------------------------

CREATE TABLE users (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    user_ref      VARCHAR(16)  NOT NULL,
    email         VARCHAR(160) NOT NULL,
    display_name  VARCHAR(120) NOT NULL,
    -- BCrypt hash. The password itself is never stored.
    password_hash VARCHAR(100) NOT NULL,
    role_code     VARCHAR(20)  NOT NULL,
    created_at    DATETIME(6)  NOT NULL,
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uq_users_user_ref UNIQUE (user_ref),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT fk_users_role FOREIGN KEY (role_code) REFERENCES roles (code)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------------------------
-- Companies, and the people at them
-- ---------------------------------------------------------------------------------------

CREATE TABLE accounts (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    account_ref VARCHAR(16)  NOT NULL,
    name        VARCHAR(200) NOT NULL,
    industry    VARCHAR(80)  NULL,
    country     VARCHAR(80)  NULL,
    website     VARCHAR(200) NULL,
    created_at  DATETIME(6)  NOT NULL,
    CONSTRAINT pk_accounts PRIMARY KEY (id),
    CONSTRAINT uq_accounts_account_ref UNIQUE (account_ref),
    INDEX ix_accounts_name (name)
) ENGINE = InnoDB;

CREATE TABLE contacts (
    id                BIGINT       NOT NULL AUTO_INCREMENT,
    contact_ref       VARCHAR(16)  NOT NULL,
    account_id        BIGINT       NOT NULL,
    first_name        VARCHAR(80)  NOT NULL,
    last_name         VARCHAR(80)  NOT NULL,
    -- Deliberately not unique: sales share generic addresses (info@, sales@) across
    -- several people at the same account.
    email             VARCHAR(160) NOT NULL,
    phone             VARCHAR(40)  NULL,
    job_title         VARCHAR(120) NULL,
    status_code       VARCHAR(20)  NOT NULL DEFAULT 'PROSPECT',
    -- Internal only. Set by finance during onboarding, never shown to the customer and
    -- never shared outside the company.
    credit_risk_note  VARCHAR(500) NULL,
    last_contacted_at DATETIME(6)  NULL,
    created_at        DATETIME(6)  NOT NULL,
    CONSTRAINT pk_contacts PRIMARY KEY (id),
    CONSTRAINT uq_contacts_contact_ref UNIQUE (contact_ref),
    -- Lets deals reference (contact, account) as a pair: see fk_deals_contact_account.
    CONSTRAINT uq_contacts_id_account UNIQUE (id, account_id),
    -- RESTRICT: an account with people at it cannot be deleted by accident.
    CONSTRAINT fk_contacts_account FOREIGN KEY (account_id) REFERENCES accounts (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_contacts_status FOREIGN KEY (status_code) REFERENCES contact_statuses (code),
    INDEX ix_contacts_last_name (last_name),
    INDEX ix_contacts_email (email)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------------------------
-- What happened with a contact: calls, emails, meetings, notes
-- ---------------------------------------------------------------------------------------

CREATE TABLE activities (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    contact_id  BIGINT        NOT NULL,
    type_code   VARCHAR(20)   NOT NULL,
    subject     VARCHAR(200)  NOT NULL,
    notes       VARCHAR(2000) NULL,
    occurred_at DATETIME(6)   NOT NULL,
    created_at  DATETIME(6)   NOT NULL,
    CONSTRAINT pk_activities PRIMARY KEY (id),
    -- CASCADE: the history of a contact goes with the contact.
    CONSTRAINT fk_activities_contact FOREIGN KEY (contact_id) REFERENCES contacts (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_activities_type FOREIGN KEY (type_code) REFERENCES activity_types (code),
    INDEX ix_activities_contact_occurred (contact_id, occurred_at)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------------------------
-- The deal pipeline
-- ---------------------------------------------------------------------------------------

CREATE TABLE deals (
    id                  BIGINT        NOT NULL AUTO_INCREMENT,
    deal_ref            VARCHAR(16)   NOT NULL,
    account_id          BIGINT        NOT NULL,
    contact_id          BIGINT        NOT NULL,
    -- The rep who owns the deal. A USER sees only the deals they own.
    owner_id            BIGINT        NOT NULL,
    title               VARCHAR(200)  NOT NULL,
    -- GBP. DECIMAL, never FLOAT or DOUBLE: money must add up to the penny.
    value               DECIMAL(18,2) NOT NULL,
    expected_close_date DATE          NOT NULL,
    stage_code          VARCHAR(20)   NOT NULL DEFAULT 'PROSPECTING',
    -- Set when the deal is WON or LOST.
    closed_date         DATE          NULL,
    -- Set only when the deal is LOST.
    lost_reason         VARCHAR(500)  NULL,
    created_at          DATETIME(6)   NOT NULL,
    updated_at          DATETIME(6)   NOT NULL,
    CONSTRAINT pk_deals PRIMARY KEY (id),
    CONSTRAINT uq_deals_deal_ref UNIQUE (deal_ref),
    CONSTRAINT ck_deals_value_positive CHECK (value > 0),
    CONSTRAINT fk_deals_account FOREIGN KEY (account_id) REFERENCES accounts (id)
        ON DELETE RESTRICT,
    -- The contact must work at the deal's account. Pointing at the (id, account_id) pair
    -- makes the database enforce it, so account_id can never disagree with the contact.
    CONSTRAINT fk_deals_contact_account FOREIGN KEY (contact_id, account_id)
        REFERENCES contacts (id, account_id) ON DELETE RESTRICT,
    CONSTRAINT fk_deals_owner FOREIGN KEY (owner_id) REFERENCES users (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_deals_stage FOREIGN KEY (stage_code) REFERENCES deal_stages (code),
    INDEX ix_deals_expected_close (expected_close_date, id),
    INDEX ix_deals_owner_stage (owner_id, stage_code)
) ENGINE = InnoDB;

CREATE TABLE deal_stage_changes (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    deal_id    BIGINT      NOT NULL,
    -- NULL on the first row of a deal: it was created, not moved.
    from_stage VARCHAR(20) NULL,
    to_stage   VARCHAR(20) NOT NULL,
    changed_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_deal_stage_changes PRIMARY KEY (id),
    -- CASCADE: deleting a deal deletes its history.
    CONSTRAINT fk_stage_changes_deal FOREIGN KEY (deal_id) REFERENCES deals (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_stage_changes_from FOREIGN KEY (from_stage) REFERENCES deal_stages (code),
    CONSTRAINT fk_stage_changes_to FOREIGN KEY (to_stage) REFERENCES deal_stages (code),
    INDEX ix_stage_changes_deal (deal_id, changed_at)
) ENGINE = InnoDB;
