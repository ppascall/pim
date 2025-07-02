import os
import requests
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter()

SHOP = os.environ.get("SHOPIFY_SHOP")  # e.g. 'your-shop-name.myshopify.com'
TOKEN = os.environ.get("SHOPIFY_ADMIN_TOKEN")  # your Admin API access token

@router.get("/shopify-products")
def get_shopify_products():
    if not SHOP or not TOKEN:
        raise HTTPException(status_code=500, detail="Shopify credentials not set")
    url = f"https://{SHOP}/admin/api/2024-01/products.json"
    headers = {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json"
    }
    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return JSONResponse(content=resp.json())