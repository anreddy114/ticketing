from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# ---------- DB ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------- App ----------
app = FastAPI(title="Ticketing System API")
api = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def sanitize_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
        "role": u["role"],
        "active": u.get("active", True),
        "created_at": u.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user or not user.get("active", True):
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---------- Models ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Literal["admin", "agent"] = "agent"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[Literal["admin", "agent"]] = None
    active: Optional[bool] = None
    password: Optional[str] = None


class IssueTypeIn(BaseModel):
    name: str
    description: Optional[str] = ""
    active: bool = True


class IssueTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None


class CustomerConfirmIn(BaseModel):
    mobile: str
    name: str


class TicketCreateIn(BaseModel):
    source: Literal["customer", "self"]
    # Customer source fields
    customer_mobile: Optional[str] = None
    customer_name: Optional[str] = None
    # Common
    issue_type_id: str
    title: str
    description: str
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    assigned_to: Optional[str] = None  # user id; defaults to self


class TicketTransferIn(BaseModel):
    to_user_id: str
    note: Optional[str] = ""


class TicketCommentIn(BaseModel):
    message: str


class TicketStatusIn(BaseModel):
    status: Literal["open", "in_progress", "closed"]
    note: Optional[str] = ""


# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.tickets.create_index("id", unique=True)
    await db.tickets.create_index("ticket_number", unique=True)
    await db.issue_types.create_index("id", unique=True)
    await db.ticket_events.create_index("ticket_id")

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@ticketing.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "active": True,
            "created_at": now_iso(),
        })
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )

    # Seed an agent for testing
    agent_email = "agent@ticketing.com"
    if not await db.users.find_one({"email": agent_email}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": agent_email,
            "password_hash": hash_password("agent123"),
            "name": "Agent One",
            "role": "agent",
            "active": True,
            "created_at": now_iso(),
        })

    # Seed default issue types
    default_types = [
        ("Billing", "Billing or payment related issues"),
        ("Technical", "Technical product issues"),
        ("Service Request", "New service / change request"),
        ("Complaint", "Customer complaint"),
        ("General Inquiry", "General questions and information"),
    ]
    for n, d in default_types:
        if not await db.issue_types.find_one({"name": n}):
            await db.issue_types.insert_one({
                "id": str(uuid.uuid4()),
                "name": n,
                "description": d,
                "active": True,
                "created_at": now_iso(),
            })


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ---------- Auth ----------
@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Account is inactive")
    token = create_access_token(user["id"], user["email"], user["role"])
    response.set_cookie(
        "access_token", token, httponly=True, secure=False, samesite="lax",
        max_age=12 * 3600, path="/",
    )
    return {"token": token, "user": sanitize_user(user)}


@api.post("/auth/logout")
async def logout(response: Response, _: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return sanitize_user(user)


@api.post("/auth/register")
async def register(payload: RegisterIn, _: dict = Depends(require_admin)):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already exists")
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "role": payload.role,
        "active": True,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    return sanitize_user(user)


# ---------- Users (Admin) ----------
@api.get("/users")
async def list_users(user: dict = Depends(get_current_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users


@api.patch("/users/{user_id}")
async def update_user(user_id: str, payload: UserUpdate, _: dict = Depends(require_admin)):
    update = {}
    if payload.name is not None:
        update["name"] = payload.name
    if payload.role is not None:
        update["role"] = payload.role
    if payload.active is not None:
        update["active"] = payload.active
    if payload.password:
        update["password_hash"] = hash_password(payload.password)
    if not update:
        raise HTTPException(status_code=400, detail="No changes")
    result = await db.users.update_one({"id": user_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return u


@api.delete("/users/{user_id}")
async def delete_user(user_id: str, current: dict = Depends(require_admin)):
    if user_id == current["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


# ---------- Issue Types ----------
@api.get("/issue-types")
async def list_issue_types(_: dict = Depends(get_current_user)):
    return await db.issue_types.find({}, {"_id": 0}).to_list(1000)


@api.post("/issue-types")
async def create_issue_type(payload: IssueTypeIn, _: dict = Depends(require_admin)):
    if await db.issue_types.find_one({"name": payload.name}):
        raise HTTPException(status_code=400, detail="Issue type already exists")
    doc = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "description": payload.description or "",
        "active": payload.active,
        "created_at": now_iso(),
    }
    await db.issue_types.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/issue-types/{type_id}")
async def update_issue_type(type_id: str, payload: IssueTypeUpdate, _: dict = Depends(require_admin)):
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="No changes")
    res = await db.issue_types.update_one({"id": type_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.issue_types.find_one({"id": type_id}, {"_id": 0})


@api.delete("/issue-types/{type_id}")
async def delete_issue_type(type_id: str, _: dict = Depends(require_admin)):
    res = await db.issue_types.delete_one({"id": type_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ---------- Customer lookup (MOCK external API) ----------
# Mock database of customers — replace with your real API later.
MOCK_CUSTOMERS = {
    "9999900001": {"name": "Rohan Sharma", "email": "rohan@example.com", "city": "Mumbai"},
    "9999900002": {"name": "Priya Patel", "email": "priya@example.com", "city": "Bengaluru"},
    "9999900003": {"name": "Arjun Verma", "email": "arjun@example.com", "city": "Delhi"},
    "9999900004": {"name": "Sneha Iyer", "email": "sneha@example.com", "city": "Chennai"},
    "9999900005": {"name": "Vikram Singh", "email": "vikram@example.com", "city": "Pune"},
}


@api.get("/customers/lookup")
async def lookup_customer(mobile: str = Query(..., min_length=4), _: dict = Depends(get_current_user)):
    """MOCK endpoint: replace internals with your real customer DB API call."""
    cust = MOCK_CUSTOMERS.get(mobile.strip())
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"mobile": mobile, **cust}


# ---------- WhatsApp (MOCK external API) ----------
async def send_whatsapp_message(mobile: str, message: str, ticket_id: str, kind: str):
    """MOCK WhatsApp send. Replace with real provider call later.
    Logs to whatsapp_messages collection so it can be audited from the UI.
    """
    doc = {
        "id": str(uuid.uuid4()),
        "ticket_id": ticket_id,
        "mobile": mobile,
        "message": message,
        "kind": kind,
        "status": "sent_mock",
        "created_at": now_iso(),
    }
    await db.whatsapp_messages.insert_one(doc)
    logging.info(f"[MOCK-WHATSAPP] -> {mobile}: {message}")
    return doc


@api.get("/whatsapp/messages")
async def list_whatsapp_messages(
    ticket_id: Optional[str] = None,
    _: dict = Depends(get_current_user),
):
    q = {}
    if ticket_id:
        q["ticket_id"] = ticket_id
    msgs = await db.whatsapp_messages.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    return msgs


# ---------- Tickets ----------
async def next_ticket_number() -> str:
    counter = await db.counters.find_one_and_update(
        {"_id": "ticket"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = counter["seq"] if counter else 1
    return f"TKT-{seq:05d}"


async def log_event(ticket_id: str, actor: dict, event_type: str, message: str = "", meta: Optional[dict] = None):
    doc = {
        "id": str(uuid.uuid4()),
        "ticket_id": ticket_id,
        "event_type": event_type,
        "message": message,
        "actor_id": actor["id"],
        "actor_name": actor["name"],
        "meta": meta or {},
        "created_at": now_iso(),
    }
    await db.ticket_events.insert_one(doc)


@api.post("/tickets")
async def create_ticket(payload: TicketCreateIn, user: dict = Depends(get_current_user)):
    issue = await db.issue_types.find_one({"id": payload.issue_type_id})
    if not issue:
        raise HTTPException(status_code=400, detail="Invalid issue type")

    assigned_to = payload.assigned_to or user["id"]
    assigned_user = await db.users.find_one({"id": assigned_to})
    if not assigned_user:
        raise HTTPException(status_code=400, detail="Assigned user not found")

    if payload.source == "customer":
        if not payload.customer_mobile or not payload.customer_name:
            raise HTTPException(status_code=400, detail="Customer mobile and name required")

    tnum = await next_ticket_number()
    ticket = {
        "id": str(uuid.uuid4()),
        "ticket_number": tnum,
        "source": payload.source,
        "customer_mobile": payload.customer_mobile if payload.source == "customer" else None,
        "customer_name": payload.customer_name if payload.source == "customer" else None,
        "issue_type_id": payload.issue_type_id,
        "issue_type_name": issue["name"],
        "title": payload.title,
        "description": payload.description,
        "priority": payload.priority,
        "status": "open",
        "created_by": user["id"],
        "created_by_name": user["name"],
        "assigned_to": assigned_to,
        "assigned_to_name": assigned_user["name"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "closed_at": None,
    }
    await db.tickets.insert_one(ticket)
    await log_event(ticket["id"], user, "created", f"Ticket created and assigned to {assigned_user['name']}")

    # Send WhatsApp acknowledgement to customer (MOCK)
    if payload.source == "customer":
        msg = (
            f"Hi {payload.customer_name}, your ticket {tnum} has been created. "
            f"Issue: {issue['name']}. Our team will reach out shortly."
        )
        await send_whatsapp_message(payload.customer_mobile, msg, ticket["id"], "created")

    ticket.pop("_id", None)
    return ticket


@api.get("/tickets")
async def list_tickets(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    issue_type_id: Optional[str] = None,
    mine: Optional[bool] = False,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    q = {}
    if status:
        q["status"] = status
    if issue_type_id:
        q["issue_type_id"] = issue_type_id
    if mine:
        q["assigned_to"] = user["id"]
    elif assigned_to:
        q["assigned_to"] = assigned_to
    if search:
        q["$or"] = [
            {"ticket_number": {"$regex": search, "$options": "i"}},
            {"title": {"$regex": search, "$options": "i"}},
            {"customer_mobile": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
        ]
    tickets = await db.tickets.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return tickets


@api.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, _: dict = Depends(get_current_user)):
    t = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    events = await db.ticket_events.find({"ticket_id": ticket_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return {"ticket": t, "events": events}


@api.post("/tickets/{ticket_id}/transfer")
async def transfer_ticket(ticket_id: str, payload: TicketTransferIn, user: dict = Depends(get_current_user)):
    t = await db.tickets.find_one({"id": ticket_id})
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if t["status"] == "closed":
        raise HTTPException(status_code=400, detail="Cannot transfer a closed ticket")
    to_user = await db.users.find_one({"id": payload.to_user_id})
    if not to_user:
        raise HTTPException(status_code=400, detail="Target user not found")
    if to_user["id"] == t["assigned_to"]:
        raise HTTPException(status_code=400, detail="Ticket already assigned to this user")
    prev_name = t.get("assigned_to_name", "")
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": {
            "assigned_to": to_user["id"],
            "assigned_to_name": to_user["name"],
            "updated_at": now_iso(),
        }},
    )
    await log_event(
        ticket_id, user, "transferred",
        f"Transferred from {prev_name} to {to_user['name']}." + (f" Note: {payload.note}" if payload.note else ""),
        meta={"from": t["assigned_to"], "to": to_user["id"]},
    )
    return await db.tickets.find_one({"id": ticket_id}, {"_id": 0})


@api.post("/tickets/{ticket_id}/comment")
async def add_comment(ticket_id: str, payload: TicketCommentIn, user: dict = Depends(get_current_user)):
    t = await db.tickets.find_one({"id": ticket_id})
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await log_event(ticket_id, user, "comment", payload.message)
    await db.tickets.update_one({"id": ticket_id}, {"$set": {"updated_at": now_iso()}})
    return {"ok": True}


@api.post("/tickets/{ticket_id}/status")
async def change_status(ticket_id: str, payload: TicketStatusIn, user: dict = Depends(get_current_user)):
    t = await db.tickets.find_one({"id": ticket_id})
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if t["status"] == payload.status:
        raise HTTPException(status_code=400, detail="Ticket already in this status")
    update = {"status": payload.status, "updated_at": now_iso()}
    if payload.status == "closed":
        update["closed_at"] = now_iso()
    await db.tickets.update_one({"id": ticket_id}, {"$set": update})
    await log_event(
        ticket_id, user, "status_change",
        f"Status changed from {t['status']} to {payload.status}" + (f". Note: {payload.note}" if payload.note else ""),
        meta={"from": t["status"], "to": payload.status},
    )

    # Send WhatsApp on close (MOCK)
    if payload.status == "closed" and t.get("source") == "customer" and t.get("customer_mobile"):
        msg = (
            f"Hi {t.get('customer_name', 'Customer')}, your ticket {t['ticket_number']} "
            f"has been closed. Thank you for reaching out."
        )
        await send_whatsapp_message(t["customer_mobile"], msg, ticket_id, "closed")

    return await db.tickets.find_one({"id": ticket_id}, {"_id": 0})


# ---------- Reports ----------
@api.get("/reports/summary")
async def reports_summary(_: dict = Depends(get_current_user)):
    total = await db.tickets.count_documents({})
    open_c = await db.tickets.count_documents({"status": "open"})
    in_prog = await db.tickets.count_documents({"status": "in_progress"})
    closed = await db.tickets.count_documents({"status": "closed"})

    # By issue type
    pipe_type = [
        {"$group": {"_id": "$issue_type_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    by_type = await db.tickets.aggregate(pipe_type).to_list(100)
    by_type = [{"name": x["_id"] or "Unknown", "count": x["count"]} for x in by_type]

    # By assignee
    pipe_assignee = [
        {"$group": {"_id": "$assigned_to_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    by_assignee = await db.tickets.aggregate(pipe_assignee).to_list(100)
    by_assignee = [{"name": x["_id"] or "Unknown", "count": x["count"]} for x in by_assignee]

    # By priority
    pipe_priority = [
        {"$group": {"_id": "$priority", "count": {"$sum": 1}}},
    ]
    by_priority = await db.tickets.aggregate(pipe_priority).to_list(100)
    by_priority = [{"name": x["_id"] or "Unknown", "count": x["count"]} for x in by_priority]

    return {
        "totals": {"total": total, "open": open_c, "in_progress": in_prog, "closed": closed},
        "by_issue_type": by_type,
        "by_assignee": by_assignee,
        "by_priority": by_priority,
    }


@api.get("/")
async def root():
    return {"service": "Ticketing System API", "status": "ok"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
