from fastapi import FastAPI, HTTPException
from supabase import create_client, Client
from config import settings

app = FastAPI(title="UniPick API", description="API for UniPick application")

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

@app.get("/")
async def health_check():
    return {"status": "ok", "service": "UniPick API"}

@app.get("/test-db")
async def test_db_connection():
    try:
        # Test items table connection
        respoonse = supabase.table("items").select("*").limit(1).execute()
        return {"db_connection": "successful", "item_sample": respoonse.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")
    
@app.post("/predict-price")
async def predict_price():
    return {"message": "Coming soon: AI Price Prediction"}