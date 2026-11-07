"""
Secure CLI bootstrap tool for initializing the primary Administrator account.
This command is strictly interactive or environment-configured; it NEVER runs automatically
in production and NEVER hardcodes public passwords.
"""

from datetime import datetime, timezone
import getpass
import os
import sys
import uuid
from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.database import SessionLocal
from app.models.user import User


def bootstrap_admin():
    print("=== STUDY_AI — SECURE ADMIN BOOTSTRAP CLI ===")

    db: Session = SessionLocal()
    try:
        existing_admins = db.query(User).filter(User.role == "admin", User.status == "active").all()
        if existing_admins:
            print(f"Lưu ý: Hệ thống hiện đã có {len(existing_admins)} tài khoản Admin đang hoạt động.")
            confirm = input("Bạn có chắc chắn muốn khởi tạo thêm một Admin mới? (yes/no): ").strip().lower()
            if confirm != "yes":
                print("Hủy thao tác.")
                return

        # Prompt credentials securely
        email = input("Nhập Email quản trị viên: ").strip().lower()
        if not email or "@" not in email:
            print("Lỗi: Email không hợp lệ.")
            sys.exit(1)

        display_name = input("Nhập Tên hiển thị: ").strip()
        if not display_name:
            display_name = "System Administrator"

        # Check existing email
        existing_user = db.query(User).filter(User.email_normalized == email).first()
        if existing_user:
            if existing_user.role == "admin":
                print("Lỗi: Tài khoản này đã tồn tại và đã là Admin.")
                return
            promote = input("Tài khoản đã tồn tại dưới vai trò khác. Nâng cấp lên Admin? (yes/no): ").strip().lower()
            if promote == "yes":
                existing_user.role = "admin"
                existing_user.status = "active"
                db.commit()
                print(f"Đã nâng cấp thành công tài khoản '{email}' lên vai trò 'admin'!")
                return
            else:
                print("Hủy thao tác.")
                return

        pwd1 = getpass.getpass("Nhập Mật khẩu quản trị (tối thiểu 8 ký tự): ")
        if len(pwd1) < 8:
            print("Lỗi: Mật khẩu phải có ít nhất 8 ký tự.")
            sys.exit(1)

        pwd2 = getpass.getpass("Xác nhận lại Mật khẩu: ")
        if pwd1 != pwd2:
            print("Lỗi: Mật khẩu xác nhận không khớp.")
            sys.exit(1)

        now = datetime.now(timezone.utc)
        new_admin = User(
            id=str(uuid.uuid4()),
            email=email,
            email_normalized=email,
            password_hash=hash_password(pwd1),
            display_name=display_name,
            role="admin",
            status="active",
            created_at=now,
            updated_at=now,
        )
        db.add(new_admin)
        db.commit()
        print(f"\n[THÀNH CÔNG] Đã khởi tạo Quản trị viên '{display_name}' ({email}) an toàn trong cơ sở dữ liệu!")
    except Exception as exc:
        db.rollback()
        print(f"Lỗi khởi tạo Admin: {exc}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    bootstrap_admin()

