"""In-memory runtime state for feature toggles (process-local).

Note: This is a simple toggle; for multi-process deployments use a shared store.
"""

USE_SHOPIFY_LIVE: bool = False


def set_live_sync(enabled: bool) -> None:
    global USE_SHOPIFY_LIVE
    USE_SHOPIFY_LIVE = bool(enabled)


def is_live_sync() -> bool:
    return bool(USE_SHOPIFY_LIVE)
