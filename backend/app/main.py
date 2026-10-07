"""
main.py
-------
Assembles the FastAPI app: creates the database tables on startup, starts
a monitor loop for every active product, and tears them down cleanly on
shutdown. Run with:

    uvicorn app.main:app --reload

Then open http://localhost:8000/docs for interactive API docs.
"""

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.browser as shared_browser
from app.checkout import shutdown as stop_checkout_engine
from app.db import init_db
from app.market import start_all as start_market_tracking
from app.market import stop_all as stop_market_tracking
from app.monitor import start_all as start_monitoring
from app.monitor import stop_all as stop_monitoring
from app.routers import checkout, history, market, products, settings, status, suggestions, webhook_test

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    await start_monitoring()
    await start_market_tracking()
    yield
    await stop_monitoring()
    await stop_market_tracking()
    await stop_checkout_engine()
    await shared_browser.shutdown()


app = FastAPI(title="CorSe Drop Monitor API", version="0.1.0", lifespan=lifespan)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(status.router)
app.include_router(history.router)
app.include_router(settings.router)
app.include_router(webhook_test.router)
app.include_router(market.router)
app.include_router(checkout.router)
app.include_router(suggestions.router)


@app.get("/api/health")
def health():
    return {"ok": True}
