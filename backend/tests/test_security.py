from app.core.security import (
    generate_session_token,
    hash_password,
    hash_session_token,
    verify_password,
)


def test_password_hash_round_trip() -> None:
    password_hash = hash_password("ParolaSigura123")

    assert password_hash != "ParolaSigura123"
    assert verify_password("ParolaSigura123", password_hash)
    assert not verify_password("parola-gresita", password_hash)


def test_session_tokens_are_random_and_hashed_deterministically() -> None:
    first_token = generate_session_token()
    second_token = generate_session_token()

    assert first_token != second_token
    assert hash_session_token(first_token, "a" * 32) == hash_session_token(
        first_token,
        "a" * 32,
    )
    assert hash_session_token(first_token, "a" * 32) != first_token
