# Sample data

Demo user is auto-created locally:

- auth id: `demo-user`
- email: `demo@aidoctor.local`
- admin: true

Suggested profile seed via PATCH `/api/v1/profile`:

```json
{
  "full_name": "Alex Demo",
  "age": 32,
  "weight_kg": 70,
  "height_cm": 170,
  "gender": "unspecified",
  "conditions": ["seasonal allergies"],
  "allergies": ["penicillin"],
  "medicines": ["cetirizine"],
  "family_history": ["hypertension"]
}
```

Example lab:

```json
{
  "name": "Hemoglobin",
  "value": 11.2,
  "unit": "g/dL",
  "reference_low": 12,
  "reference_high": 16
}
```
