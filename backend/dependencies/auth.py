import base64
import hashlib
import hmac
import json
import os
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from models.user import User

# Dev-only fallback. In production, set AUTH_SECRET_KEY in environment variables.
AUTH_SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "dev-only-secret-change-me")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
JWT_ALGORITHM = "HS256"
PASSWORD_HASH_ITERATIONS = int(os.getenv("PASSWORD_HASH_ITERATIONS", "600000"))

bearer_scheme = HTTPBearer(auto_error=False)


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("utf-8")


def _b64url_decode(raw: str) -> bytes:
    pad = "=" * ((4 - len(raw) % 4) % 4)
    return base64.urlsafe_b64decode((raw + pad).encode("utf-8"))


def get_password_hash(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_HASH_ITERATIONS,
    )
    return (
        f"pbkdf2_sha256${PASSWORD_HASH_ITERATIONS}$"
        f"{_b64url_encode(salt)}${_b64url_encode(digest)}"
    )


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        scheme, iteration_str, salt_b64, digest_b64 = password_hash.split("$", 3)
        if scheme != "pbkdf2_sha256":
            return False
        iterations = int(iteration_str)
        salt = _b64url_decode(salt_b64)
        expected_digest = _b64url_decode(digest_b64)
    except Exception:
        return False

    actual_digest = hashlib.pbkdf2_hmac(
        "sha256",
        plain_password.encode("utf-8"),
        salt,
        iterations,
    )
    return hmac.compare_digest(actual_digest, expected_digest)


def create_access_token(user_id: str) -> str:
    header = {"alg": JWT_ALGORITHM, "typ": "JWT"}
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": int(expires_at.timestamp())}

    encoded_header = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    encoded_payload = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
    signature = hmac.new(
        AUTH_SECRET_KEY.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    encoded_signature = _b64url_encode(signature)
    return f"{encoded_header}.{encoded_payload}.{encoded_signature}"


def _decode_access_token(token: str) -> dict:
    try:
        encoded_header, encoded_payload, encoded_signature = token.split(".")
        signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
        expected_signature = hmac.new(
            AUTH_SECRET_KEY.encode("utf-8"),
            signing_input,
            hashlib.sha256,
        ).digest()
        actual_signature = _b64url_decode(encoded_signature)

        if not hmac.compare_digest(actual_signature, expected_signature):
            raise ValueError("signature mismatch")

        header = json.loads(_b64url_decode(encoded_header).decode("utf-8"))
        if header.get("alg") != JWT_ALGORITHM:
            raise ValueError("algorithm mismatch")

        payload = json.loads(_b64url_decode(encoded_payload).decode("utf-8"))
        exp = payload.get("exp")
        if not isinstance(exp, int):
            raise ValueError("invalid exp")
        now_epoch = int(datetime.now(timezone.utc).timestamp())
        if exp < now_epoch:
            raise ValueError("token expired")
        return payload
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token is required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = _decode_access_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    exists = db.query(User.id).filter(User.id == user_id).first()
    if not exists:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user_id
