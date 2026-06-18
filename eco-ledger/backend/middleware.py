from functools import wraps
import html
import re
import time
import logging
from collections import defaultdict

# Configure structured request logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("eco_ledger.security")


# --- Input Sanitization ---

MAX_INPUT_LENGTH = 500  # Maximum characters allowed per string field

def sanitize_string(value: str) -> str:
    """
    Sanitizes an input string to prevent XSS and basic SQL injection.
    Escapes HTML characters, removes SQL injection patterns,
    and enforces a maximum input length.
    """
    if not isinstance(value, str):
        return value
    
    # Length validation — truncate oversized inputs
    if len(value) > MAX_INPUT_LENGTH:
        value = value[:MAX_INPUT_LENGTH]
        logger.warning(f"Input truncated to {MAX_INPUT_LENGTH} chars (oversized payload detected)")
    
    # Escape HTML tags (prevents XSS)
    sanitized = html.escape(value)
    
    # Remove basic SQL injection characters (e.g., semicolons, quotes if heavily restricted)
    # Note: Parameterized queries in sqlite3 are the primary defense against SQLi.
    # This is an additional layer of text cleansing as requested.
    sql_chars_pattern = re.compile(r"[;']")
    sanitized = sql_chars_pattern.sub("", sanitized)
    
    return sanitized

def sanitize_inputs(func):
    """
    Security Middleware/Decorator to sanitize all incoming text inputs.
    It inspects kwargs passed to the FastAPI route and sanitizes any strings.
    Also logs all incoming requests for audit trail purposes.
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Log the incoming request
        logger.info(f"API Call: {func.__name__} | Args: {list(kwargs.keys())}")
        
        sanitized_kwargs = {}
        for key, value in kwargs.items():
            if isinstance(value, str):
                sanitized_kwargs[key] = sanitize_string(value)
            elif isinstance(value, dict):
                # Sanitize top-level dictionary string values
                sanitized_dict = {}
                for d_key, d_val in value.items():
                    if isinstance(d_val, str):
                        sanitized_dict[d_key] = sanitize_string(d_val)
                    else:
                        sanitized_dict[d_key] = d_val
                sanitized_kwargs[key] = sanitized_dict
            elif hasattr(value, "model_dump"):
                # Handle Pydantic v2 models by sanitizing their string fields
                model_dict = value.model_dump()
                for m_key, m_val in model_dict.items():
                    if isinstance(m_val, str):
                        setattr(value, m_key, sanitize_string(m_val))
                sanitized_kwargs[key] = value
            elif hasattr(value, "dict"):
                # Fallback for Pydantic v1 models
                model_dict = value.dict()
                for m_key, m_val in model_dict.items():
                    if isinstance(m_val, str):
                        setattr(value, m_key, sanitize_string(m_val))
                sanitized_kwargs[key] = value
            else:
                sanitized_kwargs[key] = value
                
        return await func(*args, **sanitized_kwargs)
    return wrapper


# --- Rate Limiting Middleware ---

class RateLimiter:
    """
    In-memory rate limiter using a sliding window approach.
    Limits requests per IP address to prevent abuse.
    
    - max_requests: Maximum allowed requests in the time window
    - window_seconds: The sliding window duration (in seconds)
    """
    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests = defaultdict(list)  # IP -> list of timestamps
    
    def is_allowed(self, client_ip: str) -> bool:
        """Check if a request from the given IP is allowed."""
        now = time.time()
        window_start = now - self.window_seconds
        
        # Remove expired timestamps (outside the sliding window)
        self._requests[client_ip] = [
            ts for ts in self._requests[client_ip] if ts > window_start
        ]
        
        if len(self._requests[client_ip]) >= self.max_requests:
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return False
        
        self._requests[client_ip].append(now)
        return True
    
    def get_remaining(self, client_ip: str) -> int:
        """Returns the number of remaining requests in the current window."""
        now = time.time()
        window_start = now - self.window_seconds
        active = [ts for ts in self._requests.get(client_ip, []) if ts > window_start]
        return max(0, self.max_requests - len(active))


# Global rate limiter instance (60 requests per minute per IP)
rate_limiter = RateLimiter(max_requests=60, window_seconds=60)
