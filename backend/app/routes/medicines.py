from fastapi import APIRouter, Depends
from app.database import supabase
from app.auth import require_role

router = APIRouter()


@router.get("/medicines", dependencies=[Depends(require_role("doctor", "admin", "patient"))])
async def get_medicines():
    result = supabase.table("medicine") \
        .select("medicine_id, generic_name, brand_name") \
        .order("generic_name") \
        .execute()
    return result.data or []
