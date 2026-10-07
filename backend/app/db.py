"""
db.py
-----
Sets up the SQLite database connection.

We use SQLModel (SQLAlchemy + Pydantic in one) so the same class defines
both the database table and the shape of data we send over the API.

SQLite is the right call here: this is a single-user tool watching a
handful of products, not a multi-tenant service. It's one file on disk,
needs no separate database server, and is trivial to back up (just copy
holo.db). If this ever needs to scale past personal use, swapping the
DATABASE_URL for a Postgres connection string is a small change since
SQLModel/SQLAlchemy abstract over both.
"""

import logging
import os
from contextlib import contextmanager

from dotenv import load_dotenv
from sqlalchemy import inspect, text
from sqlmodel import SQLModel, Session, create_engine

load_dotenv()

logger = logging.getLogger("holo.db")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./holo.db")

# check_same_thread=False is safe here because we only ever use one
# connection at a time per request/task, and SQLite handles that fine.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)


def _auto_migrate() -> None:
    """
    `create_all()` only creates whole tables that don't exist yet - it
    never adds a column to a table that's already there. Without this,
    adding a field to a model (like image_url) would crash on startup
    for anyone with an existing database instead of just picking up the
    new column.

    This is not a substitute for a real migration tool (Alembic) - it
    only ever adds nullable columns, never renames or drops anything, and
    a genuinely complex schema change should still get a real migration.
    But for "a field was added to a model," it means existing data
    doesn't have to be thrown away.
    """
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    for table_name, table in SQLModel.metadata.tables.items():
        if table_name not in existing_tables:
            continue  # brand new table - create_all() already made it

        existing_columns = {col["name"] for col in inspector.get_columns(table_name)}
        for column in table.columns:
            if column.name in existing_columns:
                continue

            col_type = column.type.compile(engine.dialect)
            ddl = f'ALTER TABLE "{table_name}" ADD COLUMN "{column.name}" {col_type}'
            try:
                with engine.begin() as conn:
                    conn.execute(text(ddl))
                logger.info("Migrated: added %s.%s", table_name, column.name)
            except Exception:
                logger.exception(
                    "Could not add column %s.%s automatically - if startup fails, "
                    "you may need to delete holo.db and re-add your products.",
                    table_name,
                    column.name,
                )


def init_db() -> None:
    """Create any tables that don't exist yet, and add any columns that are
    missing from tables that do. Safe to call every startup."""
    import app.models  # noqa: F401 (registers models with SQLModel.metadata)

    SQLModel.metadata.create_all(engine)
    _auto_migrate()


@contextmanager
def get_session():
    """Use as `with get_session() as session:` for a scoped DB session."""
    session = Session(engine)
    try:
        yield session
    finally:
        session.close()
