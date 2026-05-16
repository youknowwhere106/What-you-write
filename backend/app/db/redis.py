import redis.asyncio as aioredis
import json
from typing import Optional, Any
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class RedisCache:
    _client: Optional[aioredis.Redis] = None

    async def connect(self):
        try:
            self._client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
            # Verify the connection is actually reachable.
            await self._client.ping()
            logger.info("Connected to Redis.")
        except Exception as exc:
            logger.error("Redis connection failed at startup: %s", exc)
            self._client = None
            # Server continues — cache operations are no-ops when _client is None.

    async def disconnect(self):
        if self._client:
            await self._client.close()
        logger.info("Redis connection closed.")

    async def get(self, key: str) -> Optional[Any]:
        if not self._client:
            return None
        val = await self._client.get(key)
        if val:
            try:
                return json.loads(val)
            except json.JSONDecodeError:
                return val
        return None

    async def set(self, key: str, value: Any, ttl: int = 300):
        if not self._client:
            return
        if isinstance(value, (dict, list)):
            value = json.dumps(value, default=str)
        await self._client.set(key, value, ex=ttl)

    async def delete(self, key: str):
        if not self._client:
            return
        await self._client.delete(key)

    async def delete_pattern(self, pattern: str):
        if not self._client:
            return
        async for key in self._client.scan_iter(match=pattern):
            await self._client.delete(key)


redis_cache = RedisCache()
