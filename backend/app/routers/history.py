"""
history.py
----------
Powers the History view: the list of individual restock events, and a
weekly count rollup for the bar chart. Both are computed from the
RestockEvent table - nothing here is denormalized or cached, since restock
volume is low enough that a full scan is instant.
"""

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Query
from sqlmodel import select

from app.db import get_session
from app.models import Product, RestockEvent
from app.schemas import RestockEventRead, WeeklyRestockCount

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("/restocks", response_model=list[RestockEventRead])
def list_restocks(limit: int = Query(default=50, le=500), store: Optional[str] = None):
    with get_session() as session:
        statement = (
            select(RestockEvent, Product)
            .where(RestockEvent.product_id == Product.id)
            .order_by(RestockEvent.detected_at.desc())
            .limit(limit)
        )
        rows = session.exec(statement).all()

    results = []
    for event, product in rows:
        if store and product.store != store:
            continue
        results.append(
            RestockEventRead(
                id=event.id,
                product_id=product.id,
                product_name=product.name,
                store=product.store,
                previous_status=event.previous_status,
                detected_at=event.detected_at,
                notified_at=event.notified_at,
            )
        )
    return results


@router.get("/weekly", response_model=list[WeeklyRestockCount])
def weekly_counts(weeks: int = Query(default=11, ge=1, le=52)):
    with get_session() as session:
        events = session.exec(select(RestockEvent.detected_at)).all()

    def as_utc(dt: datetime) -> datetime:
        # SQLite drops tzinfo on round-trip, but every datetime we write is
        # already UTC (see models.utcnow) - so a naive value read back means
        # "this is UTC with the label stripped," never local time. Treating
        # it as local time here (what a bare .astimezone() would do) shifts
        # it by the server's UTC offset and can bucket it into the wrong week.
        return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)

    def week_start(dt: datetime) -> str:
        dt_utc = as_utc(dt)
        monday = dt_utc.date() - timedelta(days=dt_utc.weekday())
        return monday.isoformat()

    counts: dict[str, int] = defaultdict(int)
    for detected_at in events:
        counts[week_start(detected_at)] += 1

    today = datetime.now(timezone.utc)
    ordered_weeks = []
    for i in range(weeks - 1, -1, -1):
        week_date = today - timedelta(weeks=i)
        key = week_start(week_date)
        ordered_weeks.append(WeeklyRestockCount(week_start=key, count=counts.get(key, 0)))

    return ordered_weeks
