"""
checkout.py (router)
---------------------
Read-only views onto CheckoutSession/CheckoutLog rows, plus the one
action a user can take from here: closing a session early. Sessions
themselves are only ever created by monitor.py's restock handler - there
is no "start a checkout" endpoint, since automation should only ever run
in response to a real, detected restock.
"""

from fastapi import APIRouter, HTTPException
from sqlmodel import select

import app.checkout as checkout_engine
from app.db import get_session
from app.models import CheckoutLog, CheckoutSession, Product
from app.schemas import CheckoutLogRead, CheckoutSessionRead

router = APIRouter(prefix="/api/checkout", tags=["checkout"])


def _to_read(session_row: CheckoutSession, product: Product, logs: list[CheckoutLog]) -> CheckoutSessionRead:
    return CheckoutSessionRead(
        id=session_row.id,
        product_id=product.id,
        product_name=product.name,
        store=product.store,
        state=session_row.state,
        opened_at=session_row.opened_at,
        closed_at=session_row.closed_at,
        logs=[CheckoutLogRead(ts=l.ts, level=l.level, message=l.message) for l in logs],
    )


@router.get("/sessions", response_model=list[CheckoutSessionRead])
def list_sessions(limit: int = 20):
    with get_session() as session:
        rows = session.exec(
            select(CheckoutSession, Product)
            .where(CheckoutSession.product_id == Product.id)
            .order_by(CheckoutSession.opened_at.desc())
            .limit(limit)
        ).all()

        result = []
        for checkout_session, product in rows:
            logs = session.exec(
                select(CheckoutLog).where(CheckoutLog.session_id == checkout_session.id).order_by(CheckoutLog.ts)
            ).all()
            result.append(_to_read(checkout_session, product, logs))
        return result


@router.get("/sessions/{session_id}", response_model=CheckoutSessionRead)
def get_session_detail(session_id: int):
    with get_session() as session:
        checkout_session = session.get(CheckoutSession, session_id)
        if checkout_session is None:
            raise HTTPException(status_code=404, detail="Checkout session not found")
        product = session.get(Product, checkout_session.product_id)
        logs = session.exec(
            select(CheckoutLog).where(CheckoutLog.session_id == session_id).order_by(CheckoutLog.ts)
        ).all()
        return _to_read(checkout_session, product, logs)


@router.post("/sessions/{session_id}/close")
async def close_session(session_id: int):
    with get_session() as session:
        checkout_session = session.get(CheckoutSession, session_id)
        if checkout_session is None:
            raise HTTPException(status_code=404, detail="Checkout session not found")

    await checkout_engine.close_session(session_id, reason="closed by you")
    return {"closed": True}
