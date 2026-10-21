# NOMVEX Agent Factory: verified catalog bridge

The **catalog registry** records upstream GitHub metadata. It does not
install software, create new autonomous workers, provide executable plugins,
or make any security or compatibility guarantee.

## Read-only integration

`scripts/factory-reference-policy.mjs` exports:

- `eligibleReference(entry)`: fail-closed validation of public,
  non-archived, non-fork GitHub metadata with an allowlisted code-license
  SPDX identifier, canonical source URLs, and explicitly untested
  reference-only integration state.
- `selectFactoryReferences(index, request, trustedContext)`: a bounded
  discovery-only selector with server-verified principal permissions and
  branch isolation. The only supported action is `discover`, and the
  response has `executable: false` and `installed: false`.

The trusted context **must be created by the authenticated backend**.
Never accept `authenticated`, `role`, `branches`, or `permissions`
fields from a user's request, a retrieved document, or an agent's model
output. Permissions must be checked again before each real tool action.
A bulk-index entry does not confer `catalog:discover` or
`catalog:category:*` on any user or agent.

A service-side call can look like this:

```js
import { selectFactoryReferences } from './scripts/factory-reference-policy.mjs';

// The backend must have verified these values, not read them from the client.
const principal = {
  authenticated: true,
  role: 'delegated-agent',
  branches: ['ai'],
  permissions: ['catalog:discover', 'catalog:category:mcp']
};
const proposed = selectFactoryReferences(validatedIndex, {
  action: 'discover', branch: 'ai', query: 'agent', limit: 8
}, principal);
// proposed.references are evidence-linked suggestions, NOT runnable tools.
```

## Multi-stage and resumable workflow contract

Agent orchestration belongs to the authenticated Owner-controlled factory,
not to discovered upstream repositories. A safe task lifecycle uses
`queued -> running -> verified_draft|needs_review` with bounded retries,
per-stage provenance, an idempotent request key, and a durable checkpoint.
After a crash, only an expired lease may be reconciled; a completed stage
must not be executed again simply because the user reconnects.

For every stage, record the owner scope, task and stage IDs, role, permission
decision, input hash, output hash, timestamp, model/provider if applicable,
and explicit evidence status. Store audit events in the existing private
factory event journal rather than creating a public audit log containing
personal prompts or provider credentials. Model-generated text is **not**
a verified source or an authorization grant.

Publishing, payments, outbound messaging, installing an indexed project,
upgrading dependencies, cloning its code, or executing its scripts require
separate explicit authorization and independent compatibility/security
tests. None of these actions is implemented by the catalog bridge.

## Acceptance evidence

`node --test tests/factory-reference-policy.test.mjs` validates permission
denial, branch/category separation, rejected executable actions, ambiguity
quarantine, public-source provenance and the reference-only response.
The full project CI must pass on Ubuntu, Windows and macOS with Node 22
and 24 before merge.

**Deployment state:** This repository ships an isolated, tested policy
adapter. It does not claim the private NOMVEX Owner factory has imported
or deployed the adapter; that connection needs a separately tested,
reversible server-side integration.
