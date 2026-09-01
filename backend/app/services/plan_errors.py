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


class ProjectDeactivatedError(PlanLimitError):
    """The project itself no longer occupies one of the plan's active slots."""

    code = "PROJECT_DEACTIVATED"


class PlanSelectionRequiredError(PlanLimitError):
    """The account holds more active projects than the plan allows.

    Raised for every project until the user picks which ones keep their slots,
    so a stale browser tab cannot keep studying past a downgrade.
    """

    code = "PLAN_SELECTION_REQUIRED"


class ActiveProjectSlotsFullError(PlanLimitError):
    """No free active slot left, so another project must be freed first."""

    code = "ACTIVE_PROJECT_SLOTS_FULL"
