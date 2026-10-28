# Spec Delta

## Purpose

Defines how services report their operational status and dependency health through standardized health check endpoints.

## ADDED Requirements

### Requirement: Health endpoint path

Every service SHALL expose a health endpoint at `GET /health`.

#### Scenario: Health endpoint exists
- **WHEN** a client sends `GET /health` to any service
- **THEN** the service responds with HTTP status 200 or 503

#### Scenario: Health endpoint not found on other paths
- **WHEN** a client sends `GET /healthz` or `GET /status`
- **THEN** the service responds with HTTP 404

### Requirement: Health response format

The health endpoint SHALL return a JSON response with a `status` field.

#### Scenario: Healthy service response
- **WHEN** the service and all its dependencies are operational
- **THEN** the response body is `{ "status": "ok" }` with HTTP 200

#### Scenario: Unhealthy service response
- **WHEN** a required dependency is unavailable
- **THEN** the response body is `{ "status": "error" }` with HTTP 503

### Requirement: Database connectivity check

Services with database dependencies SHALL verify database connectivity in their health check.

#### Scenario: Database is reachable
- **WHEN** the auth service receives `GET /health` and the database accepts connections
- **THEN** the response is `{ "status": "ok" }` with HTTP 200

#### Scenario: Database is unreachable
- **WHEN** the auth service receives `GET /health` and the database connection fails
- **THEN** the response is `{ "status": "error" }` with HTTP 503

### Requirement: Stateless gateway health

Services without database dependencies SHALL report health based only on their own process status.

#### Scenario: Gateway process is running
- **WHEN** the api-gateway receives `GET /health`
- **THEN** the response is `{ "status": "ok" }` with HTTP 200 (no dependency checks)
