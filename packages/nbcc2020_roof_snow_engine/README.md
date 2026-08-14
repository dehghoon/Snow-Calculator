# nbcc2020-roof-snow

Standalone Python engineering calculation library for the user-approved NBCC 2020
roof snow specification.

## Install for development

```bash
python -m pip install -e ".[test]"
```

## Run tests

```bash
pytest
```

## Engineering input guidance

```python
from nbcc2020_roof_snow.models.guidance import USER_INPUT_GUIDANCE
print(USER_INPUT_GUIDANCE["cw"]["help_text"])
```

See `docs/technical_documentation.md` for scope, limitations, and traceability.
