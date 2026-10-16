from fastapi import APIRouter

router = APIRouter(tags=["salud"])


@router.get("/health")
def health():
    return {"status": "ok"}
