from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.v1.items import items
from app.core.database import get_db
from sqlalchemy import text

from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="UniPick API", description="API for UniPick application")

origins = [
    "http://localhost:4321",
    "http://127.0.0.1:4321",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(items.router, prefix="/api/v1/items", tags=["items"])

@app.get("/")
async def health_check():
    return {"status": "ok", "service": "UniPick API"}

@app.get("/test-db")
async def test_db_connection(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("SELECT 1"))
        return {"database_connection": "successful", "result": result.scalar()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

    
@app.post("/predict-price")
async def predict_price():
    return {"message": "Coming soon: AI Price Prediction"}