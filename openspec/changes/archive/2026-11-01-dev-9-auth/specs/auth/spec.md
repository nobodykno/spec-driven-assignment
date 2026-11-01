## ADDED Requirements

### Requirement: Registration
The system SHALL let a guest register with name, email (unique, case-insensitive) and password (≥ 8 chars, a letter and a number); passwords are stored only as bcrypt hashes.

#### Scenario: Valid registration [FR-AUTH-001]
- **WHEN** a guest submits a valid name, email and password
- **THEN** the response is 201 with the user (id, name, email, role USER) and no password or hash

#### Scenario: Duplicate email [FR-AUTH-001]
- **WHEN** the email is already registered (any letter case)
- **THEN** the response is 409 `EMAIL_TAKEN`

#### Scenario: Invalid input [FR-AUTH-001]
- **WHEN** any field is missing or invalid
- **THEN** the response is 400 `VALIDATION_ERROR` with field details

### Requirement: Login
The system SHALL authenticate email and password and issue an access token and an httpOnly refresh cookie.

#### Scenario: Valid login [FR-AUTH-002]
- **WHEN** valid credentials are submitted
- **THEN** the response is 200 with an access token and a `refresh_token` httpOnly cookie

#### Scenario: Wrong email or password [FR-AUTH-002]
- **WHEN** the email is unknown or the password is wrong
- **THEN** the response is 401 `INVALID_CREDENTIALS` with the same message in both cases

#### Scenario: Rate limited [FR-AUTH-002]
- **WHEN** more than 10 failed logins come from one IP within 15 minutes
- **THEN** further attempts return 429 `RATE_LIMITED`

### Requirement: Token refresh with rotation
The system SHALL exchange a valid refresh token for a new access token and rotate the refresh token.

#### Scenario: Rotation [FR-AUTH-003]
- **WHEN** a valid, unexpired, unrevoked refresh token is presented
- **THEN** a new access token and refresh token are issued and the old token is revoked

#### Scenario: Invalid token [FR-AUTH-003]
- **WHEN** an expired, revoked or unknown refresh token is presented
- **THEN** the response is 401 `INVALID_REFRESH_TOKEN`

#### Scenario: Reuse detection [FR-AUTH-003]
- **WHEN** an already rotated token is presented again
- **THEN** every token in its family is revoked and the response is 401

### Requirement: Logout
The system SHALL revoke the current refresh token on logout.

#### Scenario: Logout [FR-AUTH-004]
- **WHEN** an authenticated user logs out
- **THEN** the refresh token is revoked, the cookie is cleared and the response is 204

#### Scenario: Revoked token reused [FR-AUTH-004]
- **WHEN** the revoked refresh token is used afterwards
- **THEN** the response is 401 `INVALID_REFRESH_TOKEN`

### Requirement: Protected routes
The gateway SHALL require a valid access token on every route except register, login, refresh and health.

#### Scenario: Missing, invalid or expired token [FR-AUTH-005]
- **WHEN** a protected route is called without a valid access token
- **THEN** the response is 401 `UNAUTHORIZED`

#### Scenario: Valid token forwards identity [FR-AUTH-005]
- **WHEN** a valid token is presented
- **THEN** the service receives `X-User-Id`, `X-User-Role`, `X-Request-Id` and `X-Internal-Token`, and client-supplied copies are dropped

### Requirement: Current user
The system SHALL return the authenticated user's profile.

#### Scenario: Profile [FR-AUTH-007]
- **WHEN** an authenticated user requests `GET /auth/me`
- **THEN** the response is 200 with id, name, email and role

#### Scenario: No identity [FR-AUTH-007]
- **WHEN** the service receives no valid internal token or user id
- **THEN** the response is 401 `UNAUTHORIZED`

### Requirement: Secret hygiene and shared contracts
Passwords and tokens SHALL never appear in logs or responses; all input SHALL be validated with Zod schemas from `@app/shared`, which also defines the contracts for projects, tasks, comments and activity.

#### Scenario: Redaction [NFR-SEC-005]
- **WHEN** a request with a password or Authorization header is logged
- **THEN** those fields are `[Redacted]`

#### Scenario: Contracts parse valid and reject invalid data [NFR-SEC-003]
- **WHEN** a contract schema receives a valid or an invalid body
- **THEN** it accepts the valid one and rejects the invalid one
