# Architecture

## Monorepo layout

```
studybuddy-v2/
├── client/          Vite + React + TypeScript + Tailwind — SPA, served as static files in prod
├── server/          Express + TypeScript — REST API, owns all secrets and DB access
├── shared/          Pure TypeScript types shared across client and server (no runtime code)
├── docs/            Architecture and security documentation
├── .github/
│   └── workflows/   CI pipeline (ci.yml) + keep-warm cron (keep-warm.yml)
├── Dockerfile       Multi-stage build: deps → build → alpine runtime
├── render.yaml      Render Blueprint — single web service, Docker runtime
└── docker-compose.yml  Local dev stack with MongoDB 7
```

The monorepo uses npm workspaces. `shared` is built first (`tsc`), then `server` and `client` both reference its compiled output.

---

## Request flow

### Authenticated API request

```mermaid
sequenceDiagram
    participant B as Browser
    participant E as Express
    participant M as requireAuth middleware
    participant R as Route handler
    participant DB as MongoDB Atlas

    B->>E: POST /api/tasks (Cookie: auth_token=<jwt>)
    E->>M: next()
    M->>M: jwt.verify(token, JWT_SECRET)
    M->>DB: UserModel.findById(payload.sub)
    DB-->>M: UserDocument
    M->>R: next() — req.user attached
    R->>DB: TaskModel.find({ userId: req.user._id })
    DB-->>R: Task[]
    R-->>B: 200 { tasks: [...] }
```

### AI request flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant R as /api/ai/message
    participant C as claude.ts
    participant A as Anthropic API

    B->>R: POST { messages: [...] }
    R->>R: requireAuth + rate limit check
    R->>C: unifiedChat(messages)
    C->>A: messages.create (Haiku, system prompt)
    A-->>C: raw text response
    C->>C: parse mode (json block → tasks, [RESOURCE:] → wellbeing)
    C-->>R: { mode, tasks | reply }
    R->>R: if mode=tasks → TaskModel.insertMany(...)
    R-->>B: { mode, tasks | reply, resourceCategory? }
```

---

## AI layer isolation

The Anthropic API key lives exclusively in `server/src/ai/claude.ts` — never referenced in `client/` and never returned in any API response. The module exports only typed functions; routes call those functions and return shaped results to the client.

```
client/          ← no ANTHROPIC_API_KEY, no raw Claude output
  └── fetch /api/ai/message
        ↓
server/routes/ai.ts    ← validates input, enforces rate limit, owns DB writes
  └── server/ai/claude.ts    ← only file that imports @anthropic-ai/sdk
        └── Anthropic API (external, server-to-server only)
```

---

## Build pipeline (multi-stage Docker)

```mermaid
graph LR
    S1["Stage 1 — deps\nnode:20-alpine\nnpm ci (all workspaces)"]
    S2["Stage 2 — build\nnpm run build\n(shared → server → client)"]
    S3["Stage 3 — runtime\nnode:20-alpine\nnon-root user uid 1001\nCOPY server/dist + client/dist\nEXPOSE 3000"]
    S1 --> S2 --> S3
```

In production, Express serves the compiled Vite bundle as static files and falls back to `index.html` for client-side routing. All API routes (`/api/*`) are handled before the static middleware.

---

## CI/CD pipeline

```mermaid
graph LR
    Push["git push → main"] --> CI
    subgraph CI ["GitHub Actions — ci.yml"]
        L[lint] & T[typecheck] & Te[test] & D[docker-build]
    end
    CI -->|all green| Render["Render auto-deploy\nDocker build + replace"]
    KW["keep-warm.yml\n*/10 * * * *"] -->|curl /api/health| Render
```

- Jobs run in parallel where possible.
- `docker-build` job validates the Dockerfile compiles cleanly without pushing an image.
- Render pulls the latest `main` and rebuilds the Docker image on every successful CI run.
