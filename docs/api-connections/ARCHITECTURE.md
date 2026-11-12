# REST API connections

Status: approved and implemented.

Leap CRM can connect external services only as MCP servers today. This adds plain REST APIs as a second kind of integration, with GetLeads as the first worked example.

## How MCP integrations work today

| Concern | Where |
| --- | --- |
| Settings UI | Settings > Integrations, `twenty-front/src/pages/settings/mcp-connections/` and `modules/settings/mcp-connections/` |
| Storage | `core.mcpServerConnection` (`engine/core-modules/mcp-connection/entities/mcp-server-connection.entity.ts`), a `WorkspaceRelatedEntity` with `workspaceId` FK and cascade delete |
| Secrets | `accessToken`, `refreshToken`, `clientSecret` encrypted with `SecretEncryptionService.encryptVersioned(value, { workspaceId })`; DB CHECK constraints require the `enc:v2:` prefix; the DTO hides them |
| Workspace isolation | `WorkspaceScopedRepository`; the only unscoped lookup is the OAuth callback, keyed by a signed state JWT |
| Permissions | `MCP_SERVERS` settings flag guards management; workflow builders list connections and tools under `WORKFLOWS` |
| GraphQL | `McpConnectionResolver` (metadata schema). API key connections call `tools/list` on save to surface a bad key immediately |
| Outbound HTTP | `McpClientService` over `SecureHttpClientService.createSsrfSafeFetch()` |
| AI chat | `McpConnectionToolProvider` in `TOOL_PROVIDERS`, category `MCP_SERVER`. Tool names are `<connection>_<tool>_<idPrefix>`; `executionRef` is `static` with `toolId = connectionId::toolName`; `ToolExecutorService` dispatches back to the provider. `isAvailable` requires `MCP_SERVERS` |
| Workflows | `MCP_TOOL_CALL` action: `McpToolCallWorkflowAction` extends `ToolBackedWorkflowAction` over `McpToolCallTool`; the front step editor renders one input per JSON Schema property |
| Workflow AI agent step | Not exposed. Workflow agents only get `DATABASE_CRUD` and `ACTION` tools (`WORKFLOW_AGENT_REGISTRY_TOOL_CATEGORIES`) |

## Can REST sit alongside MCP?

Yes. The tool registry is provider based: a new `ToolProvider` in `TOOL_PROVIDERS` with its own category is the designed extension point, and static dispatch already routes calls back to the owning provider. Workflow actions are an enumerated set, and `MCP_TOOL_CALL` shows the full path for adding one. Nothing in MCP needs to change.

Alternatives considered:

- Store REST connections in `mcpServerConnection` with a `kind` column. Rejected: half the columns are OAuth/DCR specific, the OAuth callback reads that table unscoped, and REST needs operations, which MCP discovers at runtime.
- Wrap REST APIs as an internal MCP server. Rejected: the MCP client does three round trips per call and the adapter adds nothing.
- Write each API as an app with logic functions (`twenty-sdk`). Already exposed to the AI and workflows, and the right escape hatch for APIs that need code (pagination, signing). Too heavy as the default: every API needs code and a deploy.
- Reuse the generic HTTP Request workflow step with a stored credential. Covers workflows only, not the AI.

## Data model

New table `core.apiConnection`, a `WorkspaceRelatedEntity` like `mcpServerConnection`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `workspaceId` | uuid FK, indexed | `ON DELETE CASCADE` |
| `name` | varchar | |
| `baseUrl` | varchar | e.g. `https://app.getleads.io/api/v1`; http or https only |
| `authType` | varchar | `BEARER`, `API_KEY_HEADER` or `NONE` |
| `authHeaderName` | varchar null | required for `API_KEY_HEADER`, e.g. `X-API-Key` |
| `secret` | varchar null | `EncryptedString`, `CHECK ("secret" IS NULL OR "secret" LIKE 'enc:v2:%')` |
| `defaultHeaders` | jsonb | non-secret headers sent on every call; may not set `Authorization` or the auth header |
| `operations` | jsonb | array of operations, below |
| `testOperationName` | varchar null | operation run by "Test connection" |
| `testArguments` | jsonb null | its arguments |
| `openApiSpecUrl` | varchar null | where operations were imported from, for re-import |
| `status` | varchar | `PENDING`, `CONNECTED` or `ERROR` |
| `lastErrorMessage` | varchar null | |
| `lastTestedAt` | timestamptz null | |
| `createdAt`, `updatedAt` | timestamptz | |

The secret is write-only over GraphQL: the DTO exposes `hasSecret: boolean`, and update replaces it only when a new value is sent.

Operations live in a jsonb column rather than their own table: they are always read and edited with their connection, and the count is small (import caps enabled operations, see below).

## Describing endpoints

```ts
type ApiConnectionOperation = {
  name: string; // unique per connection, [a-z0-9_]+, e.g. search_contacts_count
  description: string; // what the AI reads to decide when to call it
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string; // relative to baseUrl, may contain {param}
  parameters: {
    name: string;
    in: 'path' | 'query' | 'header';
    required: boolean;
    description?: string;
    schema?: object; // JSON Schema
  }[];
  requestBodySchema: object | null; // JSON Schema for an application/json body
  isEnabled: boolean;
};
```

Two ways to fill them, both editable afterwards:

1. Hand-defined in the settings form: method, path, description, parameters, and a JSON Schema for the body.
2. Imported from an OpenAPI 3.x JSON document, by URL (fetched server side through the SSRF-safe client) or pasted. The importer resolves local `$ref`s with a depth cap, converts OpenAPI schemas to JSON Schema, takes `operationId` (or `method_path`) as the name and `summary`/`description` as the description, skips cookie parameters and non-JSON bodies, and returns a preview. The user ticks which operations to keep. At most 50 enabled operations per connection, so the AI catalog stays small.

Each operation becomes one tool input schema: path, query and header parameters as top-level properties, plus the body's properties flattened to the top level when the body is an object schema and no names collide. Otherwise the body is a single `body` property. The call maps arguments back using the operation definition, not the generated schema.

## Calling an operation

`ApiConnectionClientService.callOperation(connection, operationName, args)`:

1. Load the operation; it must exist and be enabled. Check required parameters.
2. Build the URL from `baseUrl` + `path`. Path values are `encodeURIComponent`'d and `.`/`..` are rejected. The final URL must keep the base URL's origin and path prefix, so a tool argument can never send the key to another host.
3. Headers in order: default headers, declared header parameters, `Content-Type: application/json` when there is a body, then the auth header last so nothing overrides it.
4. Send with `SecureHttpClientService.getHttpClient` (new outbound source `api-connection`), redirects disabled, 30 s timeout, 5 MB response cap.
5. Return a `ToolOutput`: `success` for 2xx, `result` as parsed JSON (or `{ text }`), `status`. On 401/403 mark the connection `ERROR` with "The API rejected the key".

Errors are built from status and body only, never from the axios error, whose config carries the auth header.

## AI tools

`ApiConnectionToolProvider`, new `ToolCategory.API_CONNECTION`, registered next to the MCP provider.

- Same naming and dispatch as MCP: `<connection>_<operation>_<idPrefix>`, `executionRef.toolId = connectionId::operationName`. The sanitizing and naming helpers move to a shared util used by both providers.
- Descriptors come from the stored operations of `CONNECTED` connections, with no network call (the MCP provider calls `tools/list` on every catalog build).
- Only enabled operations are exposed, so admins control what the AI can call.
- Large responses go through the registry's existing compact and spill handling.
- Exposed to the AI chat only, like MCP. Workflow AI agent steps stay on CRUD and action tools.

## Workflow action

New action type `API_CONNECTION_CALL` ("Call connected API"), mirroring `MCP_TOOL_CALL`:

- Settings input `{ connectionId, operationName, arguments }`, variables allowed in arguments, expected-response support for later steps.
- Server: `ApiConnectionCallTool` + `ApiConnectionCallWorkflowAction extends ToolBackedWorkflowAction`.
- Step log `API_CONNECTION_CALL`: connection, operation, method, URL, status, truncated request body and response, duration. Never headers.
- Front: the MCP argument field helpers (`getMcpToolArgumentFields`, `coerceMcpToolArgumentValue`) become generic JSON Schema helpers used by both step editors.

A separate action type rather than generalizing `MCP_TOOL_CALL`, so persisted MCP steps are untouched.

## Test connection

`testApiConnection(id)` runs the connection's test operation with its test arguments and returns `{ success, status, durationMs, responsePreview, errorMessage }` (preview truncated to 2 KB). It updates `status`, `lastErrorMessage` and `lastTestedAt`. It runs automatically on create and on key replacement (as MCP does for API keys) and from a "Test connection" button. With no test operation set, the connection stays `PENDING` until one is chosen, because a test may cost credits on some APIs.

## Isolation and permissions

- Every read and write goes through `WorkspaceScopedRepository`. No unscoped access: there is no OAuth callback.
- The secret is encrypted with the workspace as context, enforced by a CHECK constraint, never returned, never logged.
- Outbound calls go through the SSRF-safe client; URLs are pinned to the base URL; redirects are off.
- Management (list, create, update, delete, test, OpenAPI preview) requires the `MCP_SERVERS` flag, relabeled "Integrations" in the role editor. The enum value stays `MCP_SERVERS` to avoid a data migration.
- Workflow builders list connected APIs and their operations under `WORKFLOWS`, like MCP.
- AI chat tools require the same flag in `isAvailable`, like MCP.

## Settings UI

Settings > Integrations gets an "APIs" section under "MCP Servers": a table (name, base URL, status) and a "Connect API" button.

The connection form:

- Start from: Blank or GetLeads.
- Name, base URL, auth type, header name (API key header only), API key (password input; on edit "Enter a new key to replace the saved one").
- Default headers as key/value rows.
- Operations: table with method, path, name and an enabled toggle; "Add operation" and edit in a modal; "Import from OpenAPI" (URL or paste, then tick operations).
- Test: operation picker, arguments JSON, "Test connection" button showing status, duration and a response preview.

## GraphQL (metadata schema)

- Queries: `apiConnections`, `apiConnection(id)`, and for workflow builders (WORKFLOWS) `connectedApiConnections` and `apiConnectionOperationTools(connectionId)`, which returns each enabled operation with its generated input schema.
- Mutations: `createApiConnection`, `updateApiConnection`, `deleteApiConnection`, `testApiConnection(id)`, `previewOpenApiImport({ specUrl | specJson })` (returns operations, saves nothing).
- Operations and schemas travel as JSON scalars and are validated server side with zod.
- Saving re-runs the test call only when a connectivity setting (base URL, auth, key, default headers, test operation or arguments) actually changed, so renaming a connection never spends credits.

## GetLeads worked example

A built-in template in the front:

- Name `GetLeads`, base URL `https://app.getleads.io/api/v1`, auth `BEARER`.
- Operation `search_contacts_count`: `POST /contacts/search/count`, description "Count contacts in the GetLeads database that match the filters. Free; returns only a count.", body schema `{ company_size_min: integer }` with additional properties allowed, since GetLeads does not publish a spec I could find.
- Test operation `search_contacts_count` with `{ "company_size_min": 1 }`.

The user pastes their own key. No real key appears in code, tests or fixtures; tests use `glb_live_PLACEHOLDER`-style values.

## Migration and rollout

- One fast instance command in `2-33/` creating `core.apiConnection`, generated with `database:migrate:generate`, timestamp after every existing one in that folder.
- 2.33 workspace commands have already run in production, so the startup upgrade skips this new instance command. After deploying, run `run-instance-commands` and restart server and worker.
- Shared enum additions (`ToolCategory.API_CONNECTION`, `WorkflowActionType`, step log schema) need `twenty-shared` rebuilt and `graphql:generate --configuration=metadata`.

## Tests

- Request builder: URL templating and encoding, `..` rejection, origin and prefix pinning, query params, header order, auth header for each auth type, default headers cannot override auth.
- Client: 2xx/4xx/5xx mapping, 401 marks the connection `ERROR`, errors never contain the secret, redirects not followed.
- OpenAPI importer: `$ref` resolution, parameter and body mapping, name collisions, enabled cap.
- Service: secret encrypted on create and replace, never on the DTO, workspace scoping on every query.
- Tool provider: gating on the flag, only connected and enabled operations, naming, dispatch to the right connection, cross-workspace id rejected.
- Workflow action and step log, mirroring the MCP specs.
- Front: generic argument field helpers, form schema validation.
- Integration spec: a second workspace cannot read, test or call another workspace's connection.
