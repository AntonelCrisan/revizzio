from __future__ import annotations

from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape as xml_escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Table, TableStyle

_FONTS_DIR = Path(__file__).resolve().parents[1] / "assets" / "fonts"
_FONT_REGULAR = "NotoSans"
_FONT_BOLD = "NotoSans-Bold"

pdfmetrics.registerFont(TTFont(_FONT_REGULAR, str(_FONTS_DIR / "NotoSans-Regular.ttf")))
pdfmetrics.registerFont(TTFont(_FONT_BOLD, str(_FONTS_DIR / "NotoSans-Bold.ttf")))
pdfmetrics.registerFontFamily(
    _FONT_REGULAR,
    normal=_FONT_REGULAR,
    bold=_FONT_BOLD,
    italic=_FONT_REGULAR,
    boldItalic=_FONT_BOLD,
)

_STYLES = getSampleStyleSheet()

_TITLE_STYLE = ParagraphStyle(
    "RevissTitle",
    parent=_STYLES["Title"],
    fontName=_FONT_BOLD,
    fontSize=22,
    spaceAfter=4,
)
_META_STYLE = ParagraphStyle(
    "RevissMeta",
    parent=_STYLES["Normal"],
    fontName=_FONT_REGULAR,
    fontSize=9,
    textColor=colors.HexColor("#6b6258"),
    spaceAfter=14,
)
_H2_STYLE = ParagraphStyle(
    "RevissH2",
    parent=_STYLES["Heading2"],
    fontName=_FONT_BOLD,
    fontSize=15,
    spaceBefore=14,
    spaceAfter=8,
)
_BODY_STYLE = ParagraphStyle(
    "RevissBody",
    parent=_STYLES["Normal"],
    fontName=_FONT_REGULAR,
    fontSize=10,
    leading=14,
)
_CELL_STYLE = ParagraphStyle(
    "RevissCell",
    parent=_STYLES["Normal"],
    fontName=_FONT_REGULAR,
    fontSize=8.5,
    leading=11,
)
_CELL_HEADER_STYLE = ParagraphStyle(
    "RevissCellHeader",
    parent=_CELL_STYLE,
    fontName=_FONT_BOLD,
)


def _esc(value: object) -> str:
    return xml_escape(str(value))


def _multiline(value: object) -> str:
    return _esc(value).replace("\n", "<br/>")


def _truncate(value: object, limit: int = 400) -> str:
    text = str(value)
    if len(text) <= limit:
        return text
    return f"{text[: limit - 1]}…"


def _fmt_date(value: object) -> str:
    try:
        parsed = datetime.fromisoformat(str(value))
    except ValueError:
        return str(value)
    return parsed.strftime("%d.%m.%Y")


def _fmt_datetime(value: object) -> str:
    try:
        parsed = datetime.fromisoformat(str(value))
    except ValueError:
        return str(value)
    return parsed.strftime("%d.%m.%Y %H:%M")


def _kv(label: str, value: object) -> Paragraph:
    return Paragraph(f"<b>{_esc(label)}:</b> {_esc(value)}", _BODY_STYLE)


def _table(
    header: list[str],
    rows: list[list[object]],
    *,
    col_widths: list[float],
) -> Table:
    data = [[Paragraph(_esc(cell), _CELL_HEADER_STYLE) for cell in header]]
    for row in rows:
        data.append([Paragraph(_multiline(cell), _CELL_STYLE) for cell in row])

    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0ece3")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#ddd4c4")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def account_data_export_pdf(data: dict[str, Any]) -> bytes:
    account = data["account"]
    projects = data["projects"]

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title="Datele contului Reviss",
    )

    story: list[Any] = [
        Paragraph("Datele contului tău Reviss", _TITLE_STYLE),
        Paragraph(
            f"Generat la {_esc(_fmt_datetime(data['generated_at']))}", _META_STYLE
        ),
        Paragraph("Date de cont", _H2_STYLE),
        _kv("Email", account["email"]),
        _kv("Nume", account["full_name"]),
        _kv("Rol", account["role"]),
        _kv("Cont creat la", _fmt_date(account["created_at"])),
        _kv("Temă preferată", account["theme_preference"]),
        _kv("Limbă preferată", account["language_preference"]),
        _kv("Termeni acceptați la", _fmt_date(account["terms_accepted_at"])),
        _kv("Versiune termeni", account["terms_version"]),
        _kv(
            "Consimțământ newsletter",
            "Da" if account["newsletter_consent"] else "Nu",
        ),
    ]
    if account["newsletter_consent_at"]:
        story.append(
            _kv(
                "Consimțământ acordat la",
                _fmt_date(account["newsletter_consent_at"]),
            )
        )

    story.append(Paragraph(f"Proiecte ({len(projects)})", _H2_STYLE))
    if not projects:
        story.append(Paragraph("Nu ai niciun proiect.", _BODY_STYLE))
    else:
        overview_rows: list[list[object]] = [
            [
                _truncate(project["name"], 60),
                project["subject_name"],
                "Da" if project["is_archived"] else "Nu",
                len(project["materials"]),
                len(project["flashcards"]),
                _fmt_date(project["created_at"]),
            ]
            for project in projects
        ]
        story.append(
            _table(
                [
                    "Proiect",
                    "Materie",
                    "Arhivat",
                    "Materiale",
                    "Flashcard-uri",
                    "Creat la",
                ],
                overview_rows,
                col_widths=[
                    55 * mm,
                    35 * mm,
                    18 * mm,
                    22 * mm,
                    27 * mm,
                    25 * mm,
                ],
            )
        )

    document.build(story)
    return buffer.getvalue()
