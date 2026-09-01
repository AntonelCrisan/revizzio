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


class _FakeStripe:
    """Stands in for StripeClient.retrieve_subscription."""

    def __init__(self, subscription=None, error=None):
        self.subscription = subscription
        self.error = error
        self.calls = []

    async def retrieve_subscription(self, *, subscription_id):
        self.calls.append(subscription_id)
        if self.error is not None:
            raise self.error
        return self.subscription


class _FakeSubscriptionRow:
    """Minimal stand-in for a UserSubscription row."""

    def __init__(self, stripe_subscription_id="sub_basil", status="active"):
        self.stripe_subscription_id = stripe_subscription_id
        self.status = status
        self.cancel_at_period_end = False
        self.current_period_start = None
        self.current_period_end = None


class _BackfillService(StripePaymentService):
    """Isolates _backfill_subscription_period from the DB and Stripe."""

    def __init__(self, stripe):
        self._stripe = stripe
        self._settings = None
        self._period_backfill_attempted = set()
        self.event_handler_calls = 0

    async def _handle_subscription_event(self, subscription):
        # Reaching this from a read path would let a GET change statuses and
        # cancel superseded subscriptions in Stripe.
        self.event_handler_calls += 1


def _patch_stripe_client(monkeypatch, service):
    monkeypatch.setattr(
        "app.services.stripe_payments.StripeClient",
        lambda settings: service._stripe,
    )


def test_period_backfill_writes_only_the_period_columns(monkeypatch) -> None:
    """A read-path backfill must not touch status or cancel_at_period_end."""
    import asyncio

    service = _BackfillService(_FakeStripe(subscription=BASIL_SUBSCRIPTION))
    _patch_stripe_client(monkeypatch, service)
    row = _FakeSubscriptionRow()

    updated = asyncio.run(service._backfill_subscription_period(subscription=row))

    assert updated is True
    assert row.current_period_start == datetime.fromtimestamp(1756000000, tz=UTC)
    assert row.current_period_end == datetime.fromtimestamp(1758678400, tz=UTC)
    # Untouched: these are what make the write path dangerous on a GET.
    assert row.status == "active"
    assert row.cancel_at_period_end is False
    assert service.event_handler_calls == 0


def test_period_backfill_is_attempted_only_once_per_request(monkeypatch) -> None:
    """A row Stripe cannot resolve must not be re-fetched on every read."""
    import asyncio

    stripe = _FakeStripe(subscription={"id": "sub_x", "items": {"data": [{}]}})
    service = _BackfillService(stripe)
    _patch_stripe_client(monkeypatch, service)
    row = _FakeSubscriptionRow()

    first = asyncio.run(service._backfill_subscription_period(subscription=row))
    second = asyncio.run(service._backfill_subscription_period(subscription=row))

    assert (first, second) == (False, False)
    assert stripe.calls == ["sub_basil"]  # not called twice
    assert row.current_period_end is None


def test_period_backfill_survives_a_stripe_outage(monkeypatch) -> None:
    """This runs on a read path, so a Stripe failure must not raise."""
    import asyncio

    from app.services.stripe_payments import StripeRequestError

    service = _BackfillService(_FakeStripe(error=StripeRequestError("stripe down")))
    _patch_stripe_client(monkeypatch, service)
    row = _FakeSubscriptionRow()

    assert asyncio.run(service._backfill_subscription_period(subscription=row)) is False
    assert row.current_period_end is None


def test_period_backfill_survives_missing_stripe_configuration(monkeypatch) -> None:
    """StripeClient() itself raises when the secret key is unset."""
    import asyncio

    from app.services.stripe_payments import StripeConfigurationError

    service = _BackfillService(None)

    def _raise(settings):
        raise StripeConfigurationError("STRIPE_SECRET_KEY nu este configurat.")

    monkeypatch.setattr("app.services.stripe_payments.StripeClient", _raise)
    row = _FakeSubscriptionRow()

    assert asyncio.run(service._backfill_subscription_period(subscription=row)) is False
    assert row.current_period_end is None
