from fastapi import APIRouter, HTTPException, Depends, Form
from fastapi.security import OAuth2PasswordRequestForm
from app.db.user_store import get_user_by_email, add_user
from app.core.security import pwd_context, verify_password, create_access_token

router = APIRouter()

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user['hashed_password']):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    token = create_access_token({"sub": user['email'], "role": user['role']})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/register")
def register(
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form("user")
):
    print("Registering:", email)
    if get_user_by_email(email):
        print("Already registered")
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = pwd_context.hash(password)
    print("Hashed password:", hashed_password)
    add_user(email, hashed_password, role)
    token = create_access_token({"sub": email, "role": role})
    return {"access_token": token, "token_type": "bearer", "role": role}