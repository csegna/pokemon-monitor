"""
suggestions.py (router)
------------------------
Read-only product discovery, plus dismissing one. There is no "auto-add"
endpoint here on purpose - adding a suggestion always goes through the
normal POST /api/products, with the retail URL supplied by the person
looking at the suggestion, never guessed on their behalf.
"""

from fastapi import APIRouter, Query

from app.schemas import SuggestionRead
from app.suggestions import dismiss, get_suggestions

router = APIRouter(prefix="/api/suggestions", tags=["suggestions"])


@router.get("", response_model=list[SuggestionRead])
async def list_suggestions(limit: int = Query(default=10, ge=1, le=30), refresh: bool = False):
    items = await get_suggestions(limit=limit, force_refresh=refresh)
    return [SuggestionRead(**item) for item in items]


@router.post("/{tcgplayer_product_id}/dismiss")
def dismiss_suggestion(tcgplayer_product_id: str):
    dismiss(tcgplayer_product_id)
    return {"dismissed": True}
