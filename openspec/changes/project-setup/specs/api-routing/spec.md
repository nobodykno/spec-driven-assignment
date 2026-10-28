# Spec Delta

## Purpose

Defines how the API gateway routes incoming requests to backend services and how the web application accesses the API.

## ADDED Requirements

### Requirement: Single entry point

The api-gateway SHALL be the only public-facing service; all API requests from clients MUST pass through it.

#### Scenario: Web app uses gateway
- **WHEN** the web application makes an API request
- **THEN** the request is sent to the api-gateway on port 4000

#### Scenario: Direct service access blocked in production
- **WHEN** a client attempts to connect directly to the auth service port 4001
- **THEN** the connection is refused (port not exposed publicly)

### Requirement: Auth service proxy

The api-gateway SHALL proxy requests matching `/api/v1/auth/*` to the auth service.

#### Scenario: Auth request forwarded
- **WHEN** a client sends `POST /api/v1/auth/login` to the gateway
- **THEN** the gateway forwards the request to `http://auth:4001/api/v1/auth/login`

#### Scenario: Auth health check forwarded
- **WHEN** a client sends `GET /api/v1/auth/health` to the gateway
- **THEN** the gateway forwards the request to `http://auth:4001/health`

### Requirement: Gateway health is independent

The api-gateway health endpoint SHALL NOT proxy to backend services.

#### Scenario: Gateway health check
- **WHEN** a client sends `GET /health` to the gateway
- **THEN** the gateway responds directly without forwarding to any backend

### Requirement: Development proxy

During development, the web app SHALL proxy `/api/*` requests to the api-gateway.

#### Scenario: Vite dev proxy
- **WHEN** the web app runs in development mode and fetches `/api/v1/health`
- **THEN** Vite proxies the request to `http://localhost:4000/api/v1/health`

### Requirement: API status display

The web app home page SHALL display the API connectivity status.

#### Scenario: API is online
- **WHEN** the home page loads and `GET /api/v1/health` returns HTTP 200
- **THEN** the page displays "API: online"

#### Scenario: API is offline
- **WHEN** the home page loads and `GET /api/v1/health` fails or returns non-200
- **THEN** the page displays "API: offline"
