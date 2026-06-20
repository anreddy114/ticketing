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

## What's Been Implemented (2026-02-20)
- JWT auth (admin-seeded), Admin + Agent roles, employee CRUD.
- Issue type CRUD (admin only) with 5 pre-seeded defaults.
- Ticket lifecycle: create (customer/self) → in_progress → closed → reopen.
- Customer lookup (MOCK, 5 demo numbers).
- WhatsApp send on ticket created + closed (MOCK, persisted & viewable in UI).
- Transfer with audit history; comments persisted as events.
- Reports summary endpoint + UI page.
- Beautiful "Control Room" Swiss/high-contrast UI (Chivo + IBM Plex Sans) with phosphor icons.
- Backend testing: 18/18 endpoints passed.

## Prioritized Backlog
- **P1**: Wire real customer DB API (replace `MOCK_CUSTOMERS`).
- **P1**: Wire real WhatsApp provider in `send_whatsapp_message()`.
- **P2**: Pagination & date-range filters on tickets/reports.
- **P2**: CSV export of reports.
- **P2**: SLA timers / breach indicators.
- **P3**: Customer-facing portal for status check via mobile + ticket #.
- **P3**: Forgot/reset password flow (currently admin-managed only).

## Next Tasks
- Once you share real customer DB and WhatsApp API specs, swap the two mock functions in `/app/backend/server.py` (`lookup_customer` and `send_whatsapp_message`).
