# Deployment

## Environment variables

### Web

```text
VITE_API_BASE_URL=
```

### API

```text
API_ALLOWED_ORIGINS=
```

Future approved integrations may add:

```text
AUTH_PROVIDER=
BILLING_PROVIDER=
REPORT_STORAGE_URL=
```

## API start

```bash
cd backend
python -m pip install -r requirements.txt
PYTHONPATH=app:../packages/nbcc2020_roof_snow_engine/src uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Web build

```bash
cd web
npm install
npm run build
```

Serve `web/dist/` from any static-capable host.

## Rollback

Redeploy the prior frontend artifact and prior API revision together with the prior validated engine package revision. Do not silently replace historical engineering engine versions.

## Domain

No production subdomain is assigned in this source package. Configure DNS and public URLs only after the user supplies the approved subdomain.
