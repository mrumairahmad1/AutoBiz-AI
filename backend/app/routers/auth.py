import os, random, string
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.database import get_db
from app.models.user import User, RoleEnum
from app.core.security import hash_password, verify_password, create_access_token, get_current_user, require_role
from app.core.rate_limiter import limiter, LIMITS
from app.core.logger import log_audit, log_error

router = APIRouter(prefix="/auth", tags=["Authentication"])
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)
OTP_EXPIRE_MINUTES = 10


def validate_password(p: str) -> str:
    if len(p) < 8:                                                  return "Password must be at least 8 characters."
    if not any(c.isupper() for c in p):                             return "Password must contain at least one uppercase letter."
    if not any(c.islower() for c in p):                             return "Password must contain at least one lowercase letter."
    if not any(c.isdigit() for c in p):                             return "Password must contain at least one number."
    if not any(c in "!@#$%^&*()-_=+[]{}|;:,.<>?" for c in p):     return "Password must contain at least one special character."
    return ""


def generate_otp(length=6): return "".join(random.choices(string.digits, k=length))


def send_otp_email(to_email: str, otp: str):
    if not SMTP_USER or not SMTP_PASS: raise RuntimeError("Email not configured. Set SMTP_USER and SMTP_PASS in .env")
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "AutoBiz AI - Password Reset Code"
    msg["From"] = SMTP_FROM; msg["To"] = to_email
    msg.attach(MIMEText(f"""<div style="font-family:sans-serif;max-width:480px;padding:32px;background:#0a0a0a;color:#fff;border-radius:12px;">
<h2>Password Reset Code</h2>
<div style="background:#161616;border-radius:10px;padding:28px;text-align:center;">
<div style="font-size:42px;font-weight:900;letter-spacing:14px;color:#0070f3;font-family:monospace;">{otp}</div>
<p style="color:#555;font-size:12px;margin-top:10px;">Expires in 10 minutes. Do not share this code.</p>
</div></div>""", "html"))
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
        s.ehlo(); s.starttls(); s.login(SMTP_USER, SMTP_PASS)
        s.sendmail(SMTP_FROM, to_email, msg.as_string())


class RegisterRequest(BaseModel):
    email: EmailStr; password: str; role: RoleEnum = RoleEnum.viewer

class LoginRequest(BaseModel):
    email: EmailStr; password: str

class TokenResponse(BaseModel):
    access_token: str; token_type: str; role: str

class UpdateRoleRequest(BaseModel):
    role: RoleEnum

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyOtpRequest(BaseModel):
    email: EmailStr; otp: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr; otp: str; new_password: str

class ChangePasswordRequest(BaseModel):
    old_password: str; new_password: str


@router.post("/register", status_code=201)
@limiter.limit(LIMITS["auth"])
def register(request: Request, req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    err = validate_password(req.password)
    if err: raise HTTPException(status_code=400, detail=err)
    user = User(email=req.email, hashed_password=hash_password(req.password), role=req.role)
    db.add(user); db.commit(); db.refresh(user)
    log_audit("REGISTER", req.email, f"role={req.role.value}")
    return {"message": "User registered successfully", "email": user.email, "role": user.role.value}


@router.post("/login", response_model=TokenResponse)
@limiter.limit(LIMITS["auth"])
def login(request: Request, req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        log_error(f"Failed login: {req.email}", "auth/login")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token = create_access_token({"sub": user.email, "role": user.role.value})
    log_audit("LOGIN", user.email, f"role={user.role.value}")
    return {"access_token": token, "token_type": "bearer", "role": user.role.value}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "role": current_user.role.value}


@router.get("/users")
def get_all_users(db: Session = Depends(get_db), current_user: User = Depends(require_role(RoleEnum.admin))):
    return [{"id": u.id, "email": u.email, "role": u.role.value} for u in db.query(User).all()]


@router.put("/users/{user_id}/role")
def update_user_role(user_id: int, req: UpdateRoleRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role(RoleEnum.admin))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id: raise HTTPException(status_code=400, detail="Cannot change your own role")
    old = user.role.value; user.role = req.role; db.commit()
    log_audit("ROLE_CHANGE", current_user.email, f"user={user.email} {old}=>{req.role.value}")
    return {"message": f"Role updated to {req.role.value}", "email": user.email}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(RoleEnum.admin))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id: raise HTTPException(status_code=400, detail="Cannot delete yourself")
    log_audit("USER_DELETE", current_user.email, f"deleted={user.email}")
    db.delete(user); db.commit()
    return {"message": "User deleted successfully"}


@router.post("/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user: raise HTTPException(status_code=404, detail="No account found with this email address.")
    otp = generate_otp()
    user.otp_code = hash_password(otp)
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)
    db.commit()
    try: send_otp_email(req.email, otp)
    except RuntimeError as e:
        log_error(str(e), "auth/forgot-password")
        raise HTTPException(status_code=500, detail="Failed to send email. Check SMTP configuration.")
    log_audit("FORGOT_PASSWORD", req.email, "OTP sent")
    return {"message": f"A 6-digit reset code has been sent to {req.email}"}


@router.post("/verify-otp")
@limiter.limit("10/minute")
def verify_otp(request: Request, req: VerifyOtpRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not user.otp_code: raise HTTPException(status_code=400, detail="No pending reset request.")
    if datetime.utcnow() > user.otp_expires_at:
        user.otp_code = None; user.otp_expires_at = None; db.commit()
        raise HTTPException(status_code=400, detail="Code expired. Please request a new one.")
    if not verify_password(req.otp, user.otp_code): raise HTTPException(status_code=400, detail="Incorrect code.")
    return {"message": "Code verified. Proceed to set a new password."}


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, req: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not user.otp_code: raise HTTPException(status_code=400, detail="No pending reset request.")
    if datetime.utcnow() > user.otp_expires_at:
        user.otp_code = None; user.otp_expires_at = None; db.commit()
        raise HTTPException(status_code=400, detail="Code expired.")
    if not verify_password(req.otp, user.otp_code): raise HTTPException(status_code=400, detail="Invalid reset code.")
    err = validate_password(req.new_password)
    if err: raise HTTPException(status_code=400, detail=err)
    user.hashed_password = hash_password(req.new_password)
    user.otp_code = None; user.otp_expires_at = None; db.commit()
    log_audit("PASSWORD_RESET", req.email, "via OTP")
    return {"message": "Password reset successfully. You can now sign in with your new password."}


@router.post("/change-password")
def change_password(req: ChangePasswordRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(req.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password.")
    err = validate_password(req.new_password)
    if err: raise HTTPException(status_code=400, detail=err)
    if verify_password(req.new_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="New password must differ from current password.")
    current_user.hashed_password = hash_password(req.new_password)
    db.commit()
    log_audit("PASSWORD_CHANGE", current_user.email, "via account settings")
    return {"message": "Password changed successfully."}