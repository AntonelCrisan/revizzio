"""Resolving the text a student selected in a rendered summary.

The browser shows the summary with its markdown applied, so a selection never
carries the `**` around a bold term and its diacritics may be normalised
differently from what is stored. Explaining a selection used to compare the
raw block, which rejected most selections with a 400.
"""

import pytest

from app.services.projects import (
    ProjectValidationError,
    _normalize_summary_selection_text,
    _split_summary_blocks,
    _strip_summary_inline_markdown,
    _summary_block_for_selection,
)

SUMMARY = (
    "## Autonomia morala\n\n"
    "**Autonomia** este capacitatea de a elabora norme si reguli pe baza "
    "valorilor *interiorizate*, si de a actiona independent.\n\n"
    "Heteronomia descrie `dependenta` de reguli impuse din afara.\n"
)


class _Summary:
    def __init__(self, content: str) -> None:
        self.content = content


class _Project:
    def __init__(self, content: str) -> None:
        self.summary = _Summary(content)


def _paragraph_index(needle: str) -> int:
    blocks = _split_summary_blocks(SUMMARY)
    for index, block in enumerate(blocks):
        if needle in _strip_summary_inline_markdown(block):
            return index
    raise AssertionError(f"paragraph not found for {needle!r}")


@pytest.mark.parametrize(
    "selection",
    [
        # The whole sentence as the reader sees it: no ** around "Autonomia".
        "Autonomia este capacitatea de a elabora norme si reguli",
        # A selection that starts inside the bold term.
        "Autonomia este capacitatea",
        # A selection spanning an italic term.
        "valorilor interiorizate",
        # A selection spanning inline code.
        "dependenta de reguli impuse",
        # Plain text, which always worked.
        "norme si reguli",
    ],
)
def test_a_rendered_selection_resolves_to_its_block(selection: str) -> None:
    index = _paragraph_index(selection)
    block = _summary_block_for_selection(_Project(SUMMARY), index, selection)
    assert selection in _strip_summary_inline_markdown(block)


def test_diacritic_forms_are_treated_as_the_same_letter() -> None:
    """Cedilla and comma-below forms both occur in Romanian text."""
    stored = "Autonomia înseamnă conștiință și acțiune."
    cedilla = stored.replace("ș", "ş").replace("ț", "ţ")
    assert cedilla != stored
    assert _normalize_summary_selection_text(cedilla) == (
        _normalize_summary_selection_text(stored)
    )


def test_a_selection_from_another_paragraph_is_still_rejected() -> None:
    index = _paragraph_index("Autonomia este capacitatea")
    with pytest.raises(ProjectValidationError, match="nu apartine"):
        _summary_block_for_selection(
            _Project(SUMMARY), index, "dependenta de reguli impuse"
        )


def test_an_out_of_range_paragraph_is_rejected() -> None:
    with pytest.raises(ProjectValidationError, match="nu mai este valid"):
        _summary_block_for_selection(_Project(SUMMARY), 99, "Autonomia")


def test_a_project_without_a_summary_is_rejected() -> None:
    with pytest.raises(ProjectValidationError, match="nu este disponibil"):
        _summary_block_for_selection(_Project("   "), 0, "Autonomia")


def test_no_selection_check_compares_raw_text() -> None:
    """The bug was the wiring, not the resolver.

    Explaining a selection compared the stored block directly, so it rejected
    anything touching markdown while highlighting the same words worked. This
    guards against the naive comparison coming back anywhere.
    """
    import inspect

    from app.services import projects

    source = inspect.getsource(projects)
    assert ".lower() not in " not in source, (
        "a selection check is comparing raw text; use "
        "_normalize_summary_selection_text (and strip inline markdown) instead"
    )


# --- paragraph indexing -----------------------------------------------------

# The browser splits the summary itself and sends the index of the paragraph
# the student selected in. The server looks that index up in its own split, so
# the two have to produce the same blocks for every summary shape.
SPLIT_CASES = [
    ("## Morala\n\nMorala este ansamblul normelor.\n", 2),
    ("Primul paragraf aici.\n\nAl doilea paragraf aici.\n", 2),
    ("Intro:\n\n- primul punct\n- al doilea punct\n", 3),
    (
        "Componentele sunt urmatoarele: constiinta morala; judecata morala; "
        "conduita morala.\n",
        4,
    ),
    ("Morala are trei componente: constiinta, judecata si conduita.\n", 1),
    ("Sedinta incepe la 10:30 in sala mare.\n", 1),
    ("Raportul este 3:1 in favoarea primei ipoteze.\n", 1),
    ("**Morala** este ansamblul conceptiilor si ideilor.\n", 1),
    ("Intro text.\n\n• primul\n• al doilea\n", 3),
    ("Primul.\n\n\n\nAl doilea.\n", 2),
    # A paragraph opening with a colon: the browser splits it, so the server
    # must too, or every later index in that summary is off by two.
    (": o linie ciudata; cu doua elemente.\n", 3),
]


@pytest.mark.parametrize(("content", "expected_blocks"), SPLIT_CASES)
def test_the_server_split_matches_the_browser_split(
    content: str, expected_blocks: int
) -> None:
    assert len(_split_summary_blocks(content)) == expected_blocks
