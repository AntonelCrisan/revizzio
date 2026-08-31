from datetime import UTC, datetime

from app.services.stripe_payments import StripePaymentService

BASIL_SUBSCRIPTION = {
    "id": "sub_basil",
    "customer": "cus_1",
    "status": "active",
    "cancel_at_period_end": True,
    "items": {
        "data": [
            {
                "price": {"id": "price_1"},
                "current_period_start": 1756000000,
                "current_period_end": 1758678400,
            }
        ]
    },
}

LEGACY_SUBSCRIPTION = {
    "id": "sub_legacy",
    "customer": "cus_1",
    "status": "active",
    "cancel_at_period_end": True,
    "current_period_start": 1756000000,
    "current_period_end": 1758678400,
    "items": {"data": [{"price": {"id": "price_1"}}]},
}


def _service() -> StripePaymentService:
    return StripePaymentService(session=None, settings=None)  # type: ignore[arg-type]


def test_subscription_period_read_from_items_on_basil_api() -> None:
    period_start, period_end = _service()._subscription_period(BASIL_SUBSCRIPTION)

    assert period_start == datetime.fromtimestamp(1756000000, tz=UTC)
    assert period_end == datetime.fromtimestamp(1758678400, tz=UTC)


def test_subscription_period_falls_back_to_legacy_top_level_fields() -> None:
    period_start, period_end = _service()._subscription_period(LEGACY_SUBSCRIPTION)

    assert period_start == datetime.fromtimestamp(1756000000, tz=UTC)
    assert period_end == datetime.fromtimestamp(1758678400, tz=UTC)


def test_subscription_period_is_none_when_stripe_sends_no_periods() -> None:
    subscription = {
        "id": "sub_x",
        "items": {"data": [{"price": {"id": "price_1"}}]},
    }

    assert _service()._subscription_period(subscription) == (None, None)
