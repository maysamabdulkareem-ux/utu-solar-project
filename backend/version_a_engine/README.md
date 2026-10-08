# Version A calculation engine (parked)

These files come from Version A (commit `cdb9aab`) and are kept here
**unchanged and not imported by the app** until merge Phase 5, when the
assessment page is connected to the backend engine.

| File | What it holds |
|---|---|
| `calculation.py` | Sizing + price engine: grid hours, night hours, AC by tonnage (normal/inverter), peak load, inverter (x1.25), battery, panel count (550 W), min/max price |
| `routers/assessments.py` | `POST /api/assessments/calculate`, `GET /api/assessments/{id}` |
| `routers/appliances.py` | `GET /api/appliances` |
| `models.py` | Version A models; only `Appliance`, `Assessment`, `AssessmentAppliance`, `AssessmentAC` and the request/response schemas will be ported |
| `seed.py` | Version A seed; only the appliance catalogue will be ported |

Do not import from this folder. Phase 5 will move the needed parts into
the main backend and delete this folder.
