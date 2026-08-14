class EngineeringCalculationError(ValueError):
    """Base exception for engineering calculation failures."""


class InvalidInputError(EngineeringCalculationError):
    """Raised when an input violates an explicit calculation requirement."""


class InsufficientGeometryError(EngineeringCalculationError):
    """Raised when required geometry is missing or cannot be interpreted."""


class InvalidRadicandError(EngineeringCalculationError):
    """Raised when a square-root radicand is outside its valid domain."""
