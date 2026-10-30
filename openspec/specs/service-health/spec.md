# service-health Specification

## Purpose
Defines how each backend service and the API gateway report their operational status, so developers, Docker healthchecks and the web app can tell whether the system and its database are usable.

## Requirements

### Requirement: Backend services expose a health endpoint
The api-gateway, auth and tracker services SHALL each expose `GET /health`, publicly reachable without authentication, returning a JSON body with a `status` field.

#### Scenario: Gateway health returns ok [FR-SYS-001]
- **WHEN** a client sends `GET /health` to the api-gateway
- **THEN** the response is 200 with body `{"status":"ok"}`

#### Scenario: Auth health returns ok when the database is reachable [FR-SYS-001]
- **WHEN** a client sends `GET /health` to the auth service and the database accepts connections
- **THEN** the response is 200 with body `{"status":"ok"}`

#### Scenario: Tracker health returns ok when the database is reachable [FR-SYS-001]
- **WHEN** a client sends `GET /health` to the tracker service and the database accepts connections
- **THEN** the response is 200 with body `{"status":"ok"}`

#### Scenario: Unknown path returns a standard 404 error [FR-SYS-001]
- **WHEN** a client sends `GET /healthz` to any backend service
- **THEN** the response is 404 with body `{"error":{"code":"NOT_FOUND","message":...}}`

### Requirement: Database-backed services report database outages
Services that depend on the database (auth, tracker) SHALL report unhealthy when the database cannot be reached, and SHALL answer within a bounded time instead of hanging.

#### Scenario: Auth health returns 503 when the database is down [FR-SYS-001]
- **WHEN** a client sends `GET /health` to the auth service and the database is unreachable
- **THEN** the response is 503 with body `{"status":"error"}`

#### Scenario: Tracker health returns 503 when the database is down [FR-SYS-001]
- **WHEN** a client sends `GET /health` to the tracker service and the database is unreachable
- **THEN** the response is 503 with body `{"status":"error"}`

#### Scenario: Health check does not hang on an unreachable database [FR-SYS-001]
- **WHEN** the database host does not respond
- **THEN** the health response is returned within 3 seconds

#### Scenario: Service recovers when the database comes back [FR-SYS-001]
- **WHEN** the database was unreachable and becomes reachable again without the service restarting
- **THEN** the next `GET /health` returns 200 `{"status":"ok"}`

### Requirement: Gateway health is independent of downstream services
The gateway health response SHALL reflect only the gateway process and SHALL NOT be forwarded to any downstream service.

#### Scenario: Gateway health ok while auth is down [FR-SYS-001]
- **WHEN** the auth service is not running and a client sends `GET /health` to the gateway
- **THEN** the response is 200 `{"status":"ok"}`

### Requirement: Gateway exposes health under the public API prefix
The gateway SHALL serve `GET /api/v1/health` with the same behavior as its `GET /health`, so clients that only talk to `/api/v1` can check connectivity.

#### Scenario: Versioned gateway health returns ok [FR-SYS-002]
- **WHEN** a client sends `GET /api/v1/health` to the gateway
- **THEN** the response is 200 with body `{"status":"ok"}`

#### Scenario: Unknown versioned path returns 404 [FR-SYS-002]
- **WHEN** a client sends `GET /api/v1/does-not-exist` to the gateway
- **THEN** the response is 404 with body `{"error":{"code":"NOT_FOUND","message":...}}`

### Requirement: Gateway reports unreachable downstream services
When the gateway proxies a request to a downstream service that is unreachable, it SHALL respond with the standard error format instead of hanging or leaking internal details.

#### Scenario: Auth route while auth is down [FR-SYS-001]
- **WHEN** a client sends a request to `/api/v1/auth/<path>` and the auth service is unreachable
- **THEN** the response is 503 with body `{"error":{"code":"SERVICE_UNAVAILABLE","message":...}}` and no stack trace or internal address

#### Scenario: Auth route while auth is up is forwarded [FR-SYS-001]
- **WHEN** a client sends `GET /api/v1/auth/health` and the auth service is running
- **THEN** the gateway returns the auth service's response unchanged
