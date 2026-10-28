# Flujos de extremo a extremo (Maestro)

Requieren un build de desarrollo instalado y el servidor simulado (`MOCK_SEED=1 npm run mock`)
o el entorno de pruebas del backend. El NFC no funciona en simuladores: las lecturas se
inyectan con el enlace `lavi://t?url=<URL del tag>` (solo en builds de desarrollo), que
llama a `handleTagUrl` igual que una lectura real.

```bash
maestro test e2e/
```
