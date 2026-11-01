from slowapi import Limiter
from slowapi.util import get_remote_address

# In-memory limiter using client IP as key
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    headers_enabled=False,
)
