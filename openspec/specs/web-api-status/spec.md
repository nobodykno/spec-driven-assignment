# web-api-status Specification

## Purpose
Shows users of the web app whether the backend API is reachable through the gateway, giving an immediate end-to-end connectivity signal for the local stack.

## Requirements

### Requirement: Web app displays API connectivity
The web app home page SHALL request `GET /api/v1/health` through the gateway and display "API: online" when the response is 200 with `{"status":"ok"}`, and "API: offline" otherwise. While the request is pending it SHALL display a loading state.

#### Scenario: API online [FR-SYS-002]
- **WHEN** the home page loads and `GET /api/v1/health` returns 200 `{"status":"ok"}`
- **THEN** the page shows the text "API: online"

#### Scenario: API returns an error status [FR-SYS-002]
- **WHEN** the home page loads and `GET /api/v1/health` returns 503
- **THEN** the page shows the text "API: offline"

#### Scenario: API unreachable [FR-SYS-002]
- **WHEN** the home page loads and the request to `GET /api/v1/health` fails with a network error
- **THEN** the page shows the text "API: offline"

#### Scenario: Unexpected response body [FR-SYS-002]
- **WHEN** `GET /api/v1/health` returns 200 with a body that is not `{"status":"ok"}`
- **THEN** the page shows the text "API: offline"

#### Scenario: Loading state [FR-SYS-002]
- **WHEN** the home page has sent the request and no response has arrived yet
- **THEN** the page shows a loading indicator and neither "online" nor "offline"

### Requirement: Web app reaches the API only through the gateway
In development the web app SHALL send `/api/*` requests to the gateway on port 4000 and SHALL NOT call the auth or tracker services directly.

#### Scenario: Dev server proxies API calls to the gateway [FR-SYS-002]
- **WHEN** the web dev server on :5173 receives `GET /api/v1/health`
- **THEN** the request is forwarded to the gateway at `http://localhost:4000/api/v1/health`

#### Scenario: Gateway not running in development [FR-SYS-002]
- **WHEN** the web dev server runs and the gateway is not running
- **THEN** the page shows the text "API: offline"
