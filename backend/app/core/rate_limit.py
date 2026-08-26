from __future__ import annotations

import hashlib
import logging
import time
import uuid
from collections import defaultdict
from typing import Final

from fastapi import HTTPException, status

try:
    from redis.asyncio import Redis
    from redis.exceptions import RedisError
except ImportError:  # pragma: no cover - exercised only before dependencies install.
    Redis = None  # type: ignore[assignment]
    RedisError = Exception  # type: ignore[assignment]

logger = logging.getLogger("revizzio.rate_limit")

REDIS_RATE_LIMIT_SCRIPT: Final[str] = """
local redis_time = redis.call("TIME")
local now = tonumber(redis_time[1]) * 1000000 + tonumber(redis_time[2])
local window = tonumber(ARGV[1]) * 1000000
local max_requests = tonumber(ARGV[2])
local member = ARGV[3]

redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", now - window)

local request_count = redis.call("ZCARD", KEYS[1])
if request_count >= max_requests then
  redis.call("EXPIRE", KEYS[1], tonumber(ARGV[1]))
  return 0
end

redis.call("ZADD", KEYS[1], now, member)
redis.call("EXPIRE", KEYS[1], tonumber(ARGV[1]))
return 1
"""

_memory_rate_limit_buckets: defaultdict[str, list[float]] = defaultdict(list)
_redis_client: Redis | None = None
_redis_required = False


class RateLimitBackendUnavailableError(Exception):
    pass


async def configure_rate_limit_backend(
    redis_url: str | None,
    *,
    redis_required: bool,
) -> None:
    global _redis_client, _redis_required

    _redis_required = redis_required
    await close_rate_limit_backend()

    if not redis_url:
        if redis_required:
            raise RuntimeError(
                "REDIS_URL must be configured when RATE_LIMIT_REDIS_REQUIRED is true."
            )
        logger.info("Rate limiter uses in-memory buckets.")
        return

    if Redis is None:
        if redis_required:
            raise RuntimeError("The redis Python package is not installed.")
        logger.warning("Redis package is unavailable; rate limiter uses memory.")
        return

    client = Redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
    try:
        await client.ping()
    except RedisError as exc:
        await client.aclose()
        if redis_required:
            raise RuntimeError("Redis is unavailable for rate limiting.") from exc
        logger.warning("Redis is unavailable; rate limiter uses memory: %s", exc)
        return

    _redis_client = client
    logger.info("Rate limiter uses Redis.")


async def close_rate_limit_backend() -> None:
    global _redis_client

    client = _redis_client
    _redis_client = None
    if client is not None:
        await client.aclose()


def rate_limit_backend_name() -> str:
    return "redis" if _redis_client is not None else "memory"


async def rate_limit_backend_status() -> str:
    if _redis_client is None:
        if _redis_required:
            raise RateLimitBackendUnavailableError("Redis rate limiter is not active.")
        return "memory"

    try:
        await _redis_client.ping()
    except RedisError as exc:
        if _redis_required:
            raise RateLimitBackendUnavailableError(
                "Redis rate limiter is unavailable."
            ) from exc
        logger.warning("Redis health check failed; rate limiter uses memory: %s", exc)
        await close_rate_limit_backend()
        return "memory"

    return "redis"


def clear_memory_rate_limit_buckets() -> None:
    _memory_rate_limit_buckets.clear()


async def consume_rate_limit(
    *,
    bucket_key: str,
    max_requests: int,
    window_seconds: int,
    error_message: str,
) -> None:
    if _redis_client is not None:
        try:
            allowed = await _consume_redis_rate_limit(
                bucket_key=bucket_key,
                max_requests=max_requests,
                window_seconds=window_seconds,
            )
        except RedisError as exc:
            if _redis_required:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Limitarea solicitarilor nu este disponibila momentan.",
                ) from exc
            logger.warning("Redis rate limiter failed; falling back to memory: %s", exc)
            await close_rate_limit_backend()
        else:
            if not allowed:
                _raise_rate_limit_exceeded(error_message)
            return

    _consume_memory_rate_limit(
        bucket_key=bucket_key,
        max_requests=max_requests,
        window_seconds=window_seconds,
        error_message=error_message,
    )


async def _consume_redis_rate_limit(
    *,
    bucket_key: str,
    max_requests: int,
    window_seconds: int,
) -> bool:
    if _redis_client is None:
        return True

    redis_key = _redis_rate_limit_key(bucket_key)
    member = f"{time.time_ns()}:{uuid.uuid4().hex}"
    result = await _redis_client.eval(
        REDIS_RATE_LIMIT_SCRIPT,
        1,
        redis_key,
        int(window_seconds),
        int(max_requests),
        member,
    )
    return int(result) == 1


def _consume_memory_rate_limit(
    *,
    bucket_key: str,
    max_requests: int,
    window_seconds: int,
    error_message: str,
) -> None:
    now = time.monotonic()
    bucket = _memory_rate_limit_buckets[bucket_key]
    bucket[:] = [
        timestamp
        for timestamp in bucket
        if timestamp >= now - window_seconds
    ]
    if len(bucket) >= max_requests:
        _raise_rate_limit_exceeded(error_message)
    bucket.append(now)


def _redis_rate_limit_key(bucket_key: str) -> str:
    digest = hashlib.sha256(bucket_key.encode("utf-8")).hexdigest()
    return f"revizzio:rate-limit:{digest}"


def _raise_rate_limit_exceeded(error_message: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=error_message,
    )
