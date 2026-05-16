from fastapi import APIRouter, HTTPException, Request, status
from app.schemas.auth import UserRegister, UserLogin, TokenResponse
from app.auth.password import hash_password, verify_password
from app.auth.jwt_handler import create_access_token
from app.models.user import create_user_document, user_to_response
from app.db.mongodb import get_database
from app.core.limiter import limiter
from pymongo.errors import DuplicateKeyError

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, data: UserRegister):
    db = get_database()
    hashed = hash_password(data.password)
    user_doc = create_user_document(email=data.email, hashed_password=hashed)
    try:
        result = await db.users.insert_one(user_doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    user_doc["_id"] = result.inserted_id
    token = create_access_token(
        data={"sub": str(result.inserted_id), "email": data.email}
    )
    return TokenResponse(access_token=token, user=user_to_response(user_doc))


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, data: UserLogin):
    db = get_database()
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token(
        data={"sub": str(user["_id"]), "email": user["email"]}
    )
    return TokenResponse(access_token=token, user=user_to_response(user))
