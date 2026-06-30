# HelpDesk OS — Internal Ticketing System

## Original Problem Statement
Create a simple ticketing system: employees can create self-tickets; for customer tickets, search by mobile number, confirm name, then create the ticket. WhatsApp message goes out on creation and another on close ("ur ticket has been closed"). Customer DB and WhatsApp APIs are handled by the user (we mock). Tickets can be self-assigned or transferred to other employees. Issue types & reports are selectable.

## Architecture
- **Backend**: FastAPI + Motor (MongoDB), JWT auth (Authorization Bearer + httpOnly cookie). All routes prefixed `/api`.
- **Frontend**: React + react-router + Tailwind + shadcn/ui + @phosphor-icons/react + sonner toasts.
- **DB**: MongoDB collections — `users`, `tickets`, `ticket_events`, `issue_types`, `whatsapp_messages`, `counters`.
- **Auth**: bcrypt password hashing, JWT (12h access token), role gating (admin / agent).
- **Mocks**: `/api/customers/lookup` (5 demo mobile numbers) and WhatsApp send (logged to `whatsapp_messages`).

## User Personas
- **Admin** — manages employees, issue types, sees everything.
- **Agent** — creates/handles/transfers tickets.

## Core Requirements (static)
1. Employee login (JWT).
2. Create customer ticket: search by mobile → confirm name → fill form → submit → WhatsApp created msg.
3. Create self-ticket (internal).
4. Assign to self or transfer to colleague (with audit log).
5. Comment / change status on tickets.
6. Close ticket → WhatsApp closure msg to customer.
7. Issue types selectable (pre-seeded, editable by admin).
8. Reports: totals + breakdown by type / assignee / priority.

## What's Been Implemented
- 2026-02-20: JWT auth, Admin + Agent roles, employee CRUD, issue types CRUD.
- Ticket lifecycle: create (customer/self) → in_progress → closed → reopen (with mandatory reason).
- SmartPlay live customer-lookup API.
- Meta WhatsApp Cloud API (templates + free-text 24h window) — sends on create & close.
- SIP/IVR webhooks (Asterisk) and Public website API (create ticket + feedback) with header-secret validation.
- Agent presence (Online/Offline) with heartbeat, round-robin auto-assignment preferring online agents, manual-transfer mode.
- Team performance leaderboards, agent profile, admin sessions view, Excel exports.
- 1-click customer rating system + `/rate/:token` public page.
- 2026-06-30: Online-time tracking — `presence_sessions` records each online window. Live elapsed timer removed from header (per user); replaced by an **Online Time Summary** table on `/admin/sessions` (admin-only) — shows per-employee sessions count, today online, total online, last online, current state. New endpoint `GET /api/admin/presence-summary`.
- 2026-06-30: **Today's Top Performers** leaderboard widget added to the Dashboard — ranks agents by closed-today + rating + online minutes. New endpoint `GET /api/reports/today-leaderboard`. Verified via screenshot.

## Prioritized Backlog
- **P1**: OpenAI Chat Models integration — pending user choice of use-case (auto-reply / summarize / auto-categorize / chatbot).
- **P2**: Wire `support_ticket_feedback_request` WhatsApp template once Meta approves it (currently falls back to free-text).
- **P2**: Refactor `/app/backend/server.py` (~1900 lines) into modular routers (`routers/tickets.py`, `routers/users.py`, `routers/webhooks.py`) — only if further backend expansion is planned.
- **P3**: SLA timers / breach indicators.
- **P3**: Forgot/reset password flow.

## Next Tasks
- Ask user which OpenAI use-case to wire (or skip).
- Once Meta approves `support_ticket_feedback_request`, set the template name in `backend/.env` and verify outside-24h delivery.
