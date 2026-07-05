from __future__ import annotations

import hashlib
import hmac
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from anyio import to_thread
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import Settings
from app.models import (
    StripeEvent,
    SubscriptionInvoice,
    SubscriptionPlan,
    User,
    UserSubscription,
)
from app.services.audit import add_audit_log

ACTIVE_SUBSCRIPTION_STATUSES = {"active", "trialing"}
INACTIVE_SUBSCRIPTION_STATUSES = {
    "canceled",
    "incomplete_expired",
    "unpaid",
}


class StripeConfigurationError(Exception):
    pass


class StripeRequestError(Exception):
    pass


class StripeSignatureError(Exception):
    pass


class StripePlanUnavailableError(Exception):
    pass


@dataclass(frozen=True)
class CheckoutSessionResult:
    checkout_url: str
    session_id: str


def _timestamp(value: object) -> datetime | None:
    if value is None:
        return None
    try:
        return datetime.fromtimestamp(int(value), tz=UTC)
    except (TypeError, ValueError, OSError):
        return None


def _stripe_form(data: dict[str, str]) -> bytes:
    return urllib.parse.urlencode(data).encode("utf-8")


def _uuid_or_none(value: object) -> UUID | None:
    if value is None:
        return None
    try:
        return UUID(str(value))
    except (TypeError, ValueError):
        return None


def _string_or_none(value: object) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None


def _int_or_zero(value: object) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


class StripeClient:
    def __init__(self, settings: Settings) -> None:
        if settings.stripe_secret_key is None:
            raise StripeConfigurationError("STRIPE_SECRET_KEY nu este configurat.")
        self._api_base_url = settings.stripe_api_base_url.rstrip("/")
        self._secret_key = settings.stripe_secret_key.get_secret_value()

    async def create_customer(self, *, user: User) -> dict[str, Any]:
        return await to_thread.run_sync(
            self._request,
            "POST",
            "/customers",
            {
                "email": user.email,
                "name": user.full_name,
                "metadata[user_id]": str(user.id),
            },
        )

    async def create_checkout_session(
        self,
        *,
        user: User,
        plan: SubscriptionPlan,
        customer_id: str,
        success_url: str,
        cancel_url: str,
    ) -> dict[str, Any]:
        if not plan.stripe_price_id:
            raise StripePlanUnavailableError("Planul nu are stripe_price_id.")

        return await to_thread.run_sync(
            self._request,
            "POST",
            "/checkout/sessions",
            {
                "mode": "subscription",
                "customer": customer_id,
                "client_reference_id": str(user.id),
                "line_items[0][price]": plan.stripe_price_id,
                "line_items[0][quantity]": "1",
                "success_url": success_url,
                "cancel_url": cancel_url,
                "allow_promotion_codes": "true",
                "metadata[user_id]": str(user.id),
                "metadata[plan_id]": str(plan.id),
                "metadata[plan_slug]": plan.slug,
                "subscription_data[metadata][user_id]": str(user.id),
                "subscription_data[metadata][plan_id]": str(plan.id),
                "subscription_data[metadata][plan_slug]": plan.slug,
            },
        )

    async def retrieve_checkout_session(self, *, session_id: str) -> dict[str, Any]:
        safe_session_id = urllib.parse.quote(session_id, safe="")
        return await to_thread.run_sync(
            self._request,
            "GET",
            f"/checkout/sessions/{safe_session_id}",
            None,
        )

    async def retrieve_subscription(self, *, subscription_id: str) -> dict[str, Any]:
        safe_subscription_id = urllib.parse.quote(subscription_id, safe="")
        return await to_thread.run_sync(
            self._request,
            "GET",
            f"/subscriptions/{safe_subscription_id}",
            {"expand[]": "latest_invoice"},
        )

    async def retrieve_invoice(self, *, invoice_id: str) -> dict[str, Any]:
        safe_invoice_id = urllib.parse.quote(invoice_id, safe="")
        return await to_thread.run_sync(
            self._request,
            "GET",
            f"/invoices/{safe_invoice_id}",
            None,
        )

    def _request(
        self,
        method: str,
        path: str,
        data: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        url = f"{self._api_base_url}{path}"
        request_body: bytes | None = None
        if method == "GET" and data:
            url = f"{url}?{urllib.parse.urlencode(data)}"
        elif method != "GET":
            request_body = _stripe_form(data or {})

        request = urllib.request.Request(
            url,
            data=request_body,
            method=method,
            headers={
                "Authorization": f"Bearer {self._secret_key}",
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Revizzio/1.0",
            },
        )

        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            response_body = exc.read().decode("utf-8", errors="replace")
            raise StripeRequestError(response_body) from exc
        except urllib.error.URLError as exc:
            raise StripeRequestError("Stripe nu a putut fi contactat.") from exc


class StripePaymentService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._session = session
        self._settings = settings

    async def create_checkout_session(
        self,
        *,
        user: User,
        plan_slug: str,
        user_agent: str | None,
        ip_address: str | None,
    ) -> CheckoutSessionResult:
        plan = await self._session.scalar(
            select(SubscriptionPlan).where(
                SubscriptionPlan.slug == plan_slug,
                SubscriptionPlan.is_visible.is_(True),
            )
        )
        if plan is None or plan.price_ron <= 0:
            raise StripePlanUnavailableError("Planul nu este disponibil pentru plata.")
        if not plan.stripe_price_id:
            raise StripePlanUnavailableError(
                "Planul nu are configurat Price ID-ul Stripe."
            )

        stripe = StripeClient(self._settings)
        if not user.stripe_customer_id:
            customer = await stripe.create_customer(user=user)
            customer_id = str(customer.get("id") or "")
            if not customer_id:
                raise StripeRequestError("Stripe nu a returnat customer id.")
            user.stripe_customer_id = customer_id
            await self._session.flush()
        else:
            customer_id = user.stripe_customer_id

        checkout_session = await stripe.create_checkout_session(
            user=user,
            plan=plan,
            customer_id=customer_id,
            success_url=self._success_url(),
            cancel_url=self._cancel_url(),
        )
        checkout_url = str(checkout_session.get("url") or "")
        session_id = str(checkout_session.get("id") or "")
        if not checkout_url or not session_id:
            raise StripeRequestError("Stripe nu a returnat URL-ul de checkout.")

        add_audit_log(
            self._session,
            action="stripe.checkout_session.created",
            actor=user,
            resource_type="subscription_plan",
            resource_id=str(plan.id),
            details={
                "plan_slug": plan.slug,
                "stripe_price_id": plan.stripe_price_id,
                "stripe_checkout_session_id": session_id,
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self._session.commit()
        return CheckoutSessionResult(checkout_url=checkout_url, session_id=session_id)

    async def handle_webhook(
        self,
        *,
        payload: bytes,
        signature_header: str | None,
    ) -> None:
        event = self._verify_event(payload, signature_header)
        event_id = str(event.get("id") or "")
        event_type = str(event.get("type") or "")
        if not event_id or not event_type:
            raise StripeSignatureError("Eveniment Stripe invalid.")

        existing_event = await self._session.get(StripeEvent, event_id)
        if existing_event is not None:
            return

        self._session.add(
            StripeEvent(
                id=event_id,
                type=event_type,
                payload=event,
                processed_at=datetime.now(UTC),
            )
        )

        data_object = event.get("data", {}).get("object", {})
        if event_type == "checkout.session.completed":
            await self._handle_checkout_completed(data_object)
        elif event_type in {
            "customer.subscription.created",
            "customer.subscription.updated",
            "customer.subscription.deleted",
        }:
            await self._handle_subscription_event(data_object)
        elif event_type == "invoice.payment_failed":
            await self._handle_invoice_payment_failed(data_object)
        elif event_type in {"invoice.paid", "invoice.payment_succeeded"}:
            await self._handle_invoice_paid(data_object)

        await self._session.commit()

    async def sync_completed_checkout_session(
        self,
        *,
        user: User,
        session_id: str,
        user_agent: str | None,
        ip_address: str | None,
    ) -> User:
        if not session_id.startswith("cs_"):
            raise StripePlanUnavailableError("Sesiunea Stripe este invalida.")

        stripe = StripeClient(self._settings)
        checkout_session = await stripe.retrieve_checkout_session(
            session_id=session_id,
        )
        if checkout_session.get("status") != "complete":
            raise StripePlanUnavailableError("Plata nu este finalizata in Stripe.")
        if checkout_session.get("payment_status") not in {
            "paid",
            "no_payment_required",
        }:
            raise StripePlanUnavailableError("Plata nu este confirmata in Stripe.")

        metadata = checkout_session.get("metadata") or {}
        session_user_id = metadata.get("user_id") or checkout_session.get(
            "client_reference_id"
        )
        if str(session_user_id) != str(user.id):
            raise StripePlanUnavailableError("Sesiunea nu apartine contului curent.")

        await self._handle_checkout_completed(checkout_session)
        stripe_subscription_id = _string_or_none(checkout_session.get("subscription"))
        if stripe_subscription_id is not None:
            await self._sync_latest_invoice_from_stripe(
                stripe=stripe,
                stripe_subscription_id=stripe_subscription_id,
            )
        add_audit_log(
            self._session,
            action="stripe.checkout_session.synced",
            actor=user,
            resource_type="stripe_checkout_session",
            resource_id=session_id,
            details={"payment_status": checkout_session.get("payment_status")},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await self._session.commit()

        refreshed_user = await self._session.scalar(
            select(User)
            .options(selectinload(User.current_plan))
            .where(User.id == user.id)
        )
        return refreshed_user or user

    async def list_user_invoices(self, *, user: User) -> list[SubscriptionInvoice]:
        invoices = await self._fetch_user_invoices(user=user)
        if invoices:
            return invoices

        await self._sync_latest_invoices_for_user(user=user)
        await self._session.commit()
        return await self._fetch_user_invoices(user=user)

    async def _fetch_user_invoices(self, *, user: User) -> list[SubscriptionInvoice]:
        result = await self._session.scalars(
            select(SubscriptionInvoice)
            .where(SubscriptionInvoice.user_id == user.id)
            .order_by(SubscriptionInvoice.created_at.desc())
            .limit(50)
        )
        return list(result)

    async def _sync_latest_invoices_for_user(self, *, user: User) -> None:
        try:
            stripe = StripeClient(self._settings)
        except StripeConfigurationError:
            return

        result = await self._session.scalars(
            select(UserSubscription)
            .where(UserSubscription.user_id == user.id)
            .order_by(UserSubscription.updated_at.desc())
            .limit(5)
        )
        for subscription in result:
            await self._sync_latest_invoice_from_stripe(
                stripe=stripe,
                stripe_subscription_id=subscription.stripe_subscription_id,
            )

    async def _handle_checkout_completed(self, session: dict[str, Any]) -> None:
        metadata = session.get("metadata") or {}
        user_id = metadata.get("user_id") or session.get("client_reference_id")
        plan_id = metadata.get("plan_id")
        stripe_customer_id = str(session.get("customer") or "")
        stripe_subscription_id = str(session.get("subscription") or "")
        if (
            not user_id
            or not plan_id
            or not stripe_customer_id
            or not stripe_subscription_id
        ):
            return

        parsed_user_id = _uuid_or_none(user_id)
        parsed_plan_id = _uuid_or_none(plan_id)
        if parsed_user_id is None or parsed_plan_id is None:
            return

        user = await self._session.get(User, parsed_user_id)
        plan = await self._session.get(SubscriptionPlan, parsed_plan_id)
        if user is None or plan is None or not plan.stripe_price_id:
            return

        user.stripe_customer_id = stripe_customer_id
        status = (
            "active"
            if session.get("payment_status") == "paid"
            else "checkout_completed"
        )
        await self._upsert_subscription(
            user=user,
            plan=plan,
            stripe_customer_id=stripe_customer_id,
            stripe_subscription_id=stripe_subscription_id,
            stripe_price_id=plan.stripe_price_id,
            status=status,
            current_period_start=None,
            current_period_end=None,
            cancel_at_period_end=False,
            canceled_at=None,
        )

    async def _handle_subscription_event(
        self,
        subscription: dict[str, Any],
    ) -> None:
        stripe_subscription_id = str(subscription.get("id") or "")
        stripe_customer_id = str(subscription.get("customer") or "")
        status = str(subscription.get("status") or "unknown")
        price_id = self._subscription_price_id(subscription)
        if not stripe_subscription_id or not stripe_customer_id or not price_id:
            return

        plan = await self._session.scalar(
            select(SubscriptionPlan).where(SubscriptionPlan.stripe_price_id == price_id)
        )
        user = await self._session.scalar(
            select(User).where(User.stripe_customer_id == stripe_customer_id)
        )
        if user is None:
            metadata = subscription.get("metadata") or {}
            user_id = metadata.get("user_id")
            parsed_user_id = _uuid_or_none(user_id)
            if parsed_user_id is not None:
                user = await self._session.get(User, parsed_user_id)
        if user is None or plan is None:
            return

        user.stripe_customer_id = stripe_customer_id
        await self._upsert_subscription(
            user=user,
            plan=plan,
            stripe_customer_id=stripe_customer_id,
            stripe_subscription_id=stripe_subscription_id,
            stripe_price_id=price_id,
            status=status,
            current_period_start=_timestamp(subscription.get("current_period_start")),
            current_period_end=_timestamp(subscription.get("current_period_end")),
            cancel_at_period_end=bool(subscription.get("cancel_at_period_end")),
            canceled_at=_timestamp(subscription.get("canceled_at")),
        )

    async def _handle_invoice_payment_failed(self, invoice: dict[str, Any]) -> None:
        await self._mark_subscription_from_invoice(invoice, status="past_due")

    async def _handle_invoice_paid(self, invoice: dict[str, Any]) -> None:
        await self._mark_subscription_from_invoice(invoice, status="active")

    async def _mark_subscription_from_invoice(
        self,
        invoice: dict[str, Any],
        *,
        status: str,
    ) -> None:
        user_subscription = await self._find_subscription_from_invoice(invoice)
        await self._upsert_invoice(
            invoice=invoice,
            user_subscription=user_subscription,
        )
        if user_subscription is None:
            return
        stripe_subscription_id = user_subscription.stripe_subscription_id
        user_subscription = await self._session.scalar(
            select(UserSubscription).where(
                UserSubscription.stripe_subscription_id == stripe_subscription_id
            )
        )
        if user_subscription is None:
            return
        user_subscription.status = status
        user_subscription.updated_at = datetime.now(UTC)
        user = await self._session.get(User, user_subscription.user_id)
        if user is not None and status in ACTIVE_SUBSCRIPTION_STATUSES:
            user.current_plan_id = user_subscription.plan_id

    async def _sync_latest_invoice_from_stripe(
        self,
        *,
        stripe: StripeClient,
        stripe_subscription_id: str,
    ) -> None:
        try:
            subscription = await stripe.retrieve_subscription(
                subscription_id=stripe_subscription_id,
            )
        except StripeRequestError:
            return

        latest_invoice = subscription.get("latest_invoice")
        if isinstance(latest_invoice, dict):
            await self._upsert_invoice(invoice=latest_invoice)
            return

        if isinstance(latest_invoice, str) and latest_invoice.startswith("in_"):
            try:
                invoice = await stripe.retrieve_invoice(invoice_id=latest_invoice)
            except StripeRequestError:
                return
            await self._upsert_invoice(invoice=invoice)

    async def _find_subscription_from_invoice(
        self,
        invoice: dict[str, Any],
    ) -> UserSubscription | None:
        stripe_subscription_id = self._invoice_subscription_id(invoice)
        if stripe_subscription_id is None:
            return None

        return await self._session.scalar(
            select(UserSubscription).where(
                UserSubscription.stripe_subscription_id == stripe_subscription_id
            )
        )

    async def _upsert_invoice(
        self,
        *,
        invoice: dict[str, Any],
        user_subscription: UserSubscription | None = None,
    ) -> None:
        stripe_invoice_id = _string_or_none(invoice.get("id"))
        stripe_customer_id = _string_or_none(invoice.get("customer"))
        if stripe_invoice_id is None or stripe_customer_id is None:
            return

        if user_subscription is None:
            user_subscription = await self._find_subscription_from_invoice(invoice)

        user: User | None = None
        plan_id: UUID | None = None
        user_subscription_id: UUID | None = None
        if user_subscription is not None:
            user = await self._session.get(User, user_subscription.user_id)
            plan_id = user_subscription.plan_id
            user_subscription_id = user_subscription.id

        if user is None:
            user = await self._session.scalar(
                select(User).where(User.stripe_customer_id == stripe_customer_id)
            )
            if user is not None:
                plan_id = user.current_plan_id

        if user is None:
            return

        subscription_invoice = await self._session.scalar(
            select(SubscriptionInvoice).where(
                SubscriptionInvoice.stripe_invoice_id == stripe_invoice_id
            )
        )
        if subscription_invoice is None:
            subscription_invoice = SubscriptionInvoice(
                user_id=user.id,
                stripe_invoice_id=stripe_invoice_id,
                stripe_customer_id=stripe_customer_id,
                status=str(invoice.get("status") or "unknown"),
                created_at=datetime.now(UTC),
            )
            self._session.add(subscription_invoice)

        status_transitions = invoice.get("status_transitions") or {}
        subscription_invoice.user_id = user.id
        subscription_invoice.plan_id = plan_id
        subscription_invoice.user_subscription_id = user_subscription_id
        subscription_invoice.stripe_customer_id = stripe_customer_id
        subscription_invoice.stripe_subscription_id = self._invoice_subscription_id(
            invoice
        )
        subscription_invoice.hosted_invoice_url = _string_or_none(
            invoice.get("hosted_invoice_url")
        )
        subscription_invoice.invoice_pdf_url = _string_or_none(
            invoice.get("invoice_pdf")
        )
        subscription_invoice.number = _string_or_none(invoice.get("number"))
        subscription_invoice.status = str(invoice.get("status") or "unknown")
        subscription_invoice.currency = str(invoice.get("currency") or "ron").upper()
        subscription_invoice.amount_due = _int_or_zero(invoice.get("amount_due"))
        subscription_invoice.amount_paid = _int_or_zero(invoice.get("amount_paid"))
        subscription_invoice.period_start = _timestamp(invoice.get("period_start"))
        subscription_invoice.period_end = _timestamp(invoice.get("period_end"))
        subscription_invoice.paid_at = _timestamp(status_transitions.get("paid_at"))
        subscription_invoice.updated_at = datetime.now(UTC)

    async def _upsert_subscription(
        self,
        *,
        user: User,
        plan: SubscriptionPlan,
        stripe_customer_id: str,
        stripe_subscription_id: str,
        stripe_price_id: str,
        status: str,
        current_period_start: datetime | None,
        current_period_end: datetime | None,
        cancel_at_period_end: bool,
        canceled_at: datetime | None,
    ) -> None:
        now = datetime.now(UTC)
        user_subscription = await self._session.scalar(
            select(UserSubscription).where(
                UserSubscription.stripe_subscription_id == stripe_subscription_id
            )
        )
        if user_subscription is None:
            user_subscription = UserSubscription(
                user_id=user.id,
                plan_id=plan.id,
                stripe_customer_id=stripe_customer_id,
                stripe_subscription_id=stripe_subscription_id,
                stripe_price_id=stripe_price_id,
                status=status,
                created_at=now,
            )
            self._session.add(user_subscription)

        user_subscription.user_id = user.id
        user_subscription.plan_id = plan.id
        user_subscription.stripe_customer_id = stripe_customer_id
        user_subscription.stripe_subscription_id = stripe_subscription_id
        user_subscription.stripe_price_id = stripe_price_id
        user_subscription.status = status
        user_subscription.current_period_start = current_period_start
        user_subscription.current_period_end = current_period_end
        user_subscription.cancel_at_period_end = cancel_at_period_end
        user_subscription.canceled_at = canceled_at
        user_subscription.updated_at = now

        if status in ACTIVE_SUBSCRIPTION_STATUSES:
            user.current_plan_id = plan.id
        elif (
            status in INACTIVE_SUBSCRIPTION_STATUSES
            and user.current_plan_id == plan.id
        ):
            free_plan = await self._session.scalar(
                select(SubscriptionPlan).where(SubscriptionPlan.slug == "start")
            )
            user.current_plan_id = free_plan.id if free_plan is not None else None

    def _verify_event(
        self,
        payload: bytes,
        signature_header: str | None,
    ) -> dict[str, Any]:
        if self._settings.stripe_webhook_secret is None:
            raise StripeConfigurationError("STRIPE_WEBHOOK_SECRET nu este configurat.")
        if not signature_header:
            raise StripeSignatureError("Lipseste Stripe-Signature.")

        timestamp_value: str | None = None
        signatures: list[str] = []
        for item in signature_header.split(","):
            key, _, value = item.partition("=")
            if key == "t":
                timestamp_value = value
            elif key == "v1":
                signatures.append(value)

        if not timestamp_value or not signatures:
            raise StripeSignatureError("Semnatura Stripe este invalida.")

        try:
            timestamp = int(timestamp_value)
        except ValueError as exc:
            raise StripeSignatureError("Timestamp Stripe invalid.") from exc
        if abs(int(time.time()) - timestamp) > 300:
            raise StripeSignatureError("Semnatura Stripe a expirat.")

        signed_payload = f"{timestamp_value}.".encode() + payload
        expected_signature = hmac.new(
            self._settings.stripe_webhook_secret.get_secret_value().encode("utf-8"),
            signed_payload,
            hashlib.sha256,
        ).hexdigest()
        if not any(
            hmac.compare_digest(expected_signature, signature)
            for signature in signatures
        ):
            raise StripeSignatureError("Semnatura Stripe nu corespunde.")

        try:
            return json.loads(payload.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise StripeSignatureError("Payload Stripe invalid.") from exc

    def _subscription_price_id(self, subscription: dict[str, Any]) -> str | None:
        items = subscription.get("items", {}).get("data", [])
        if not items:
            return None
        price = items[0].get("price") or {}
        price_id = price.get("id")
        return str(price_id) if price_id else None

    def _invoice_subscription_id(self, invoice: dict[str, Any]) -> str | None:
        direct_subscription = _string_or_none(invoice.get("subscription"))
        if direct_subscription is not None:
            return direct_subscription

        parent = invoice.get("parent")
        if not isinstance(parent, dict):
            return None

        subscription_details = parent.get("subscription_details")
        if not isinstance(subscription_details, dict):
            return None

        return _string_or_none(subscription_details.get("subscription"))

    def _success_url(self) -> str:
        return (
            f"{self._settings.public_app_url}"
            f"{self._settings.stripe_checkout_success_path}"
        )

    def _cancel_url(self) -> str:
        return (
            f"{self._settings.public_app_url}"
            f"{self._settings.stripe_checkout_cancel_path}"
        )
