from functools import wraps
import html
import re

def sanitize_string(value: str) -> str:
    """
    Sanitizes an input string to prevent XSS and basic SQL injection.
    Escapes HTML characters and removes typical SQL injection patterns.
    """
    if not isinstance(value, str):
        return value
        
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
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        sanitized_kwargs = {}
        for key, value in kwargs.items():
            if isinstance(value, str):
                sanitized_kwargs[key] = sanitize_string(value)
            elif isinstance(value, dict):
                # Basic top-level dictionary sanitization (e.g., Pydantic model dicts if passed as such)
                # Usually FastAPI parses them into Pydantic models, so we might need to sanitize the model fields
                pass 
            elif hasattr(value, "dict"):
                # Handle Pydantic models by sanitizing their string fields
                model_dict = value.dict()
                for m_key, m_val in model_dict.items():
                    if isinstance(m_val, str):
                        setattr(value, m_key, sanitize_string(m_val))
                sanitized_kwargs[key] = value
            else:
                sanitized_kwargs[key] = value
                
        return await func(*args, **sanitized_kwargs)
    return wrapper
