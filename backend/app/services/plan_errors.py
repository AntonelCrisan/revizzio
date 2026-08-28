class PlanLimitError(Exception):
    """Raised when a plan/usage limit blocks an operation."""

    code: str = "FEATURE_NOT_AVAILABLE"


class FeatureNotAvailableError(PlanLimitError):
    code = "FEATURE_NOT_AVAILABLE"


class MaterialLimitReachedError(PlanLimitError):
    code = "MATERIAL_LIMIT_REACHED"


class PageLimitReachedError(PlanLimitError):
    code = "PAGE_LIMIT_REACHED"


class MaxPagesPerMaterialExceededError(PlanLimitError):
    code = "MAX_PAGES_PER_DOCUMENT_EXCEEDED"


class AiCreditsLimitReachedError(PlanLimitError):
    code = "AI_CREDITS_LIMIT_REACHED"


class OcrLimitReachedError(PlanLimitError):
    code = "OCR_LIMIT_REACHED"


class CostCeilingReachedError(PlanLimitError):
    code = "COST_CEILING_REACHED"
