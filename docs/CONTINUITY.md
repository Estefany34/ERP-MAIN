# CONTINUITY REPORT

## Actualización 2026-10-02: auditoría QA

La fase previa descrita abajo es histórica. Web y API ya están publicadas. La nueva auditoría, matriz funcional y lista priorizada de pendientes están en [AUDITORIA_QA_2026-10-02.md](AUDITORIA_QA_2026-10-02.md). Se corrigieron formularios, edición y acciones de estado; se añadieron módulos accesibles, navegación web con hash, renovación/revocación y restauración de sesión persistente, adaptación de listados al celular y pruebas de componentes con API local. Las versiones de React/RN se alinearon con Expo. El APK físico y la persistencia transaccional de Atlas siguen pendientes.

## Phase current
FASE CIERRE PRE-DEPLOYMENT: seguridad, privacidad, preparación para despliegue académico y validación final sin publicar.

## Completed
- Kept the ERP backend and API contracts unchanged while applying the required deployment-safety patches.
- Hardened production environment validation for JWT, MongoDB, and CORS in the API.
- Restricted public registration by default in production and kept it opt-in only when explicitly enabled.
- Reduced access token lifetime to 30 minutes and preserved refresh/logout flow behavior.
- Sanitize health and error responses and removed internal detail leakage.
- Hid demo credentials from production builds and kept dev-only helper values behind `__DEV__`.
- Used the real authenticated company name in the topbar instead of a hardcoded value.
- Removed fake dashboard deltas and kept metrics derived from `/dashboard` only.
- Kept the official Fanix logo integrated without replacing or inventing an alternate asset.
- Applied minimal responsive stability for smaller screens without redesigning the app.
- Updated the environment template and protected secret-like files through `.gitignore`.

## Branding and asset status
- The official Fanix logo is present and integrated at `apps/web/src/components/branding/Group 1.png`.
- The integration remains in place through `apps/web/src/components/branding/FanixLogo.tsx` and the shared layout.
- No logo replacement or redesign was introduced beyond the existing approved asset.

## Files modified in this closure phase
- `apps/api/.env.example`
- `.gitignore`
- `apps/api/src/app.ts`
- `apps/api/src/auth.ts`
- `apps/api/src/http.ts`
- `apps/api/src/routes.ts`
- `apps/api/src/server.ts`
- `apps/api/src/store.ts`
- `apps/api/src/routes.test.ts`
- `apps/web/App.tsx`
- `apps/web/src/components/layout/AppShell.tsx`
- `docs/CONTINUITY.md`
- `docs/limitations.md`
- `docs/DEPLOYMENT_CHECKLIST.md`

## Verification executed and results
- `npm run typecheck --workspace apps/api` → PASS
- `npm test --workspace apps/api` → PASS (8 tests, 0 failures)
- `npm run build --workspace apps/api` → PASS
- `npm run typecheck --workspace apps/web` → PASS after adding the missing script in `apps/web/package.json`
- `npm run export --workspace apps/web` → PASS; static export generated under `dist`

## Known risks
- The workspace still contains local environment files for developer use; they remain outside version control and were not inspected or published.
- Production deployment still requires a real `JWT_SECRET`, `MONGODB_URI`, `CORS_ORIGIN`, and secure hosting configuration outside this repository closure.
- No deployment actions were executed in this phase.

## Exact next step
Proceed to deployment planning only after the academic deployment environment is defined and the actual hosting values are created externally, without publishing any secrets in the repository.
