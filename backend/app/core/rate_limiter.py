"""
In-memory thread-safe rate limiter for authentication brute-force protection.
Implements sliding-window failure tracking per client IP and targeted account.
"""

from collections import defaultdict
from datetime import datetime, timedelta, timezone
import threading
from typing import Optional, Tuple
from fastapi import HTTPException, status


class AuthRateLimiter:
    def __init__(self, max_failures: int = 5, window_seconds: int = 60):
        self.max_failures = max_failures
        self.window_seconds = window_seconds
        self._lock = threading.Lock()
        # Key: (ip, email_clean) -> list of failure timestamps
        self._failures: dict[Tuple[str, str], list[datetime]] = defaultdict(list)
        # Key: ip -> list of failure timestamps
        self._ip_failures: dict[str, list[datetime]] = defaultdict(list)

    def _clean_expired(self, records: list[datetime], now: datetime) -> list[datetime]:
        cutoff = now - timedelta(seconds=self.window_seconds)
        return [t for t in records if t > cutoff]

    def check_rate_limit(self, ip: str, email: str) -> None:
        """
        Raises HTTP 429 Too Many Requests if failure threshold is exceeded.
        """
        now = datetime.now(timezone.utc)
        email_clean = email.strip().lower()

        with self._lock:
            # Check combined (IP, email)
            key = (ip, email_clean)
            self._failures[key] = self._clean_expired(self._failures[key], now)
            if len(self._failures[key]) >= self.max_failures:
                oldest = self._failures[key][0]
                retry_after = max(1, int(self.window_seconds - (now - oldest).total_seconds()))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Quá nhiều lần thử đăng nhập không thành công. Vui lòng thử lại sau {retry_after} giây.",
                    headers={"Retry-After": str(retry_after)},
                )

            # Check raw IP brute-force across multiple accounts
            self._ip_failures[ip] = self._clean_expired(self._ip_failures[ip], now)
            if len(self._ip_failures[ip]) >= self.max_failures * 3:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Phát hiện lưu lượng đăng nhập bất thường từ địa chỉ IP này. Vui lòng thử lại sau.",
                    headers={"Retry-After": str(self.window_seconds)},
                )

    def record_failure(self, ip: str, email: str) -> None:
        """Records an authentication failure timestamp."""
        now = datetime.now(timezone.utc)
        email_clean = email.strip().lower()

        with self._lock:
            self._failures[(ip, email_clean)].append(now)
            self._ip_failures[ip].append(now)

    def record_success(self, ip: str, email: str) -> None:
        """Clears failure history on successful authentication."""
        email_clean = email.strip().lower()
        with self._lock:
            self._failures.pop((ip, email_clean), None)

    def reset_all(self) -> None:
        """Utility for test suites."""
        with self._lock:
            self._failures.clear()
            self._ip_failures.clear()


auth_rate_limiter = AuthRateLimiter(max_failures=5, window_seconds=60)

