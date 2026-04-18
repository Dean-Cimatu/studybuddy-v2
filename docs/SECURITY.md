# Security

A summary of the security decisions made in StudyBuddy v2 and the reasoning behind each.

---

## Authentication — JWT in httpOnly cookie

Tokens are stored in an **httpOnly, Secure, SameSite=Lax cookie**, not in `localStorage` or `sessionStorage`.

```typescript
res.cookie('auth_token', token, {
  httpOnly: true,          // JavaScript cannot read this cookie
  secure: true,            // HTTPS only in production
  sameSite: 'lax',         // Blocks cross-site POST forgery
  maxAge: 60 * 60 * 1000, // 1 hour
});
```

**Why not localStorage?** The v1 prototype stored tokens in `localStorage`, making them readable by any JavaScript on the page — including injected scripts from XSS attacks. `httpOnly` cookies are invisible to JavaScript entirely.

**Token lifetime:** JWTs expire after 1 hour, signed with a 256-bit random `JWT_SECRET` (`openssl rand -hex 32`).

---

## Password hashing — bcrypt, cost factor 12

```typescript
const hash = await bcrypt.hash(password, 12);   // store
const valid = await bcrypt.compare(input, hash); // verify
```

- Passwords are **never stored in plaintext**.
- Cost factor 12 makes brute-force attacks computationally expensive (~300ms per hash on modern hardware).
- The `passwordHash` field is stripped from all API responses via a Mongoose `toJSON` transform.

---

## AI key isolation — server-side only

`ANTHROPIC_API_KEY` is loaded exclusively in `server/src/ai/claude.ts` and is never:
- Referenced in any `client/` file
- Returned in any API response body or header
- Logged to stdout

The test suite includes an explicit assertion: responses are grepped for `sk-ant` and the test fails if found.

---

## Per-user query scoping — no IDOR

Every database query that touches user data is filtered by `userId`:

```typescript
// Tasks — every query scopes to the authenticated user
TaskModel.find({ userId: req.user!._id })
TaskModel.findOne({ _id: id, userId: req.user!._id })
TaskModel.findOneAndUpdate({ _id: id, userId: req.user!._id }, ...)
TaskModel.findOneAndDelete({ _id: id, userId: req.user!._id })
```

A request for a task that exists but belongs to another user returns **404**, not 403. This prevents leaking the existence of other users' data (IDOR — Insecure Direct Object Reference). The test suite includes explicit cross-user isolation tests covering read, update, and delete.

---

## Rate limiting — AI endpoints

AI endpoints (`/api/ai/*`) are protected by `express-rate-limit`, keyed on `req.user._id` (not IP address, which can be shared across NAT):

```
20 requests per user per hour
```

This prevents abuse of the Anthropic API and limits the blast radius if an account is compromised.

---

## Input validation — Zod schemas

All request bodies are validated with [Zod](https://zod.dev) before reaching route logic:

- Email format enforced on register/login
- Password minimum 8 characters enforced server-side (not just client-side)
- Task fields validated for type and enum membership
- AI message arrays capped at 20 entries

Invalid input returns 400 with the first validation error; it never reaches the database or AI layer.

---

## Dependency hygiene

- `npm audit` runs as part of CI
- Dependabot is configured for weekly npm updates and monthly Docker base image updates (`.github/dependabot.yml`)
- Production Docker image is `node:20-alpine` and runs as a non-root user (`uid 1001`)
