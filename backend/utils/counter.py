"""
Simple in-memory deploy counter.

BASE_PAGES_DEPLOYED env var seeds the counter so the number survives
server restarts (set it manually in Render dashboard to the last known count).
The in-memory delta resets on restart but climbs back up as deploys happen.
"""
import os
import threading

_lock = threading.Lock()
_count = 0                                          # deploys this session
BASE   = int(os.getenv("BASE_PAGES_DEPLOYED", "0")) # persistent seed from env


def increment() -> int:
    global _count
    with _lock:
        _count += 1
        return BASE + _count


def total() -> int:
    with _lock:
        return BASE + _count
