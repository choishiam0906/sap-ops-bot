"""Rate Limiter — slowapi 기반 요청 제한."""

from slowapi import Limiter
from slowapi.util import get_remote_address

# 기본 rate limiter (클라이언트 IP 기반)
limiter = Limiter(key_func=get_remote_address)

# 엔드포인트별 제한 설정 상수
CHAT_RATE_LIMIT = "10/minute"
KNOWLEDGE_RATE_LIMIT = "30/minute"
FEEDBACK_RATE_LIMIT = "20/minute"
