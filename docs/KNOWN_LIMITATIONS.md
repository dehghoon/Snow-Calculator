# Known Limitations

1. The supplied Agent #2 package implements calculation primitives and case calculations, but it does **not** expose the full high-level physical-roof geometry interpreter described in the handoff (`physical geometry -> Cases I-III -> case_geometry payload`).
2. Because GPT3 must not invent or reinterpret Cases I-III, the current lower-adjacent-roof API accepts explicit structured case geometry as engineering-review input.
3. The Agent #2 technical documentation states that the complete official Commentary benchmark dataset was not supplied, so official benchmark tests are not fabricated.
4. The official PDF endpoint is deny-by-default until the approved LinkoTech authentication and report entitlement integration is available.
5. Jurisdiction-specific NBCC adoption and amendments are outside the model-code calculation unless separately verified.
6. React Three Fiber project geometry is not included yet because the required complete high-level geometry descriptor is not present in the supplied engine contract. The current load distribution visualization is payload-driven and calculation-safe.
