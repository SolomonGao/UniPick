from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.v1.items import items, favorites
from app.api.v1.users import profile as user_profile
from app.api.v1 import moderation
from app.core.database import get_db
from app.core.rate_limit import limiter, setup_rate_limiting
from sqlalchemy import text

from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="UniPick API", description="API for UniPick application")

# 🔧 修复：添加 API 限流
setup_rate_limiting(app)

origins = [
    "http://localhost:4321",
    "http://127.0.0.1:4321",
    "http://localhost:4322",
    "http://127.0.0.1:4322",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(items.router, prefix="/api/v1/items", tags=["items"])
app.include_router(favorites.router, prefix="/api/v1/items", tags=["favorites"])
app.include_router(user_profile.router, prefix="/api/v1/users", tags=["users"])
app.include_router(moderation.router, prefix="/api/v1/moderation", tags=["moderation"])

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