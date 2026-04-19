from sqlalchemy import Column, Integer, String, Enum, DateTime
from .base import Base
import enum


class RoleEnum(str, enum.Enum):
    admin   = "admin"
    manager = "manager"
    viewer  = "viewer"


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String,  unique=True, index=True, nullable=False)
    hashed_password = Column(String,  nullable=False)
    role            = Column(Enum(RoleEnum), default=RoleEnum.viewer, nullable=False)

    # ── Password-reset fields ──────────────────────────────
    # Stores a 6-digit OTP and when it expires (10 minutes).
    # Cleared after successful password reset.
    otp_code        = Column(String,   nullable=True)
    otp_expires_at  = Column(DateTime, nullable=True)