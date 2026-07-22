from __future__ import annotations

import json
import time
from typing import Any, AsyncGenerator, Optional

import httpx
from fastapi import Depends, Header, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models import AuditLog, UserProfile

# In-memory rate limit fallback when Redis is unavailable
_rate_buckets: dict[str, list[float]] = {}


async def get_redis_client():
    settings = get_settings()
    try:
        import redis.asyncio as redis

        client = redis.from_url(settings.redis_url, decode_responses=True)
        await client.ping()
        return client
    except Exception:
        return None


async def rate_limit(
    request: Request,
    settings: Settings = Depends(get_settings),
    x_forwarded_for: Optional[str] = Header(default=None),
) -> None:
    key = x_forwarded_for or (request.client.host if request.client else "anon")
    window = 60
    limit = settings.rate_limit_per_minute
    now = time.time()

    redis_client = await get_redis_client()
    if redis_client:
        try:
            bucket = f"rl:{key}"
            count = await redis_client.incr(bucket)
            if count == 1:
                await redis_client.expire(bucket, window)
            if count > limit:
                raise HTTPException(status_code=429, detail="Rate limit exceeded")
            return
        except HTTPException:
            raise
        except Exception:
            pass

    stamps = [t for t in _rate_buckets.get(key, []) if now - t < window]
    stamps.append(now)
    _rate_buckets[key] = stamps
    if len(stamps) > limit:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")


async def get_optional_user(
    authorization: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Optional[UserProfile]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        if settings.supabase_jwt_secret:
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_aud": False},
            )
        else:
            # Dev mode: accept base64-ish demo tokens as email
            payload = {"sub": "demo-user", "email": "demo@aidoctor.local"}
            if token.startswith("demo."):
                try:
                    payload = json.loads(token[5:])
                except Exception:
                    pass
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    auth_user_id = str(payload.get("sub", "demo-user"))
    email = str(payload.get("email", f"{auth_user_id}@users.local"))

    result = await db.execute(select(UserProfile).where(UserProfile.auth_user_id == auth_user_id))
    user = result.scalar_one_or_none()
    if not user:
        user = UserProfile(
            auth_user_id=auth_user_id,
            email=email,
            full_name=payload.get("name") or "Demo User",
            is_admin=email.lower() in settings.admin_email_list or email == "demo@aidoctor.local",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


async def get_current_user(user: Optional[UserProfile] = Depends(get_optional_user)) -> UserProfile:
    if not user:
        # Auto demo user for local development without auth
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


async def get_current_user_or_demo(
    authorization: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> UserProfile:
    user = await get_optional_user(authorization, db, settings)
    if user:
        return user
    # Create/fetch durable demo user
    result = await db.execute(select(UserProfile).where(UserProfile.auth_user_id == "demo-user"))
    user = result.scalar_one_or_none()
    if not user:
        user = UserProfile(
            auth_user_id="demo-user",
            email="demo@aidoctor.local",
            full_name="Demo User",
            age=32,
            weight_kg=70,
            height_cm=170,
            gender="unspecified",
            conditions=[],
            allergies=[],
            medicines=[],
            is_admin=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


async def require_admin(user: UserProfile = Depends(get_current_user_or_demo)) -> UserProfile:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def write_audit(
    db: AsyncSession,
    *,
    user_id: Optional[str],
    action: str,
    resource: Optional[str] = None,
    ip_address: Optional[str] = None,
    details: Optional[dict[str, Any]] = None,
) -> None:
    db.add(
        AuditLog(
            user_id=user_id,
            action=action,
            resource=resource,
            ip_address=ip_address,
            details=details or {},
        )
    )
    await db.commit()


async def stream_text(chunks: list[str]) -> AsyncGenerator[str, None]:
    for chunk in chunks:
        yield chunk
