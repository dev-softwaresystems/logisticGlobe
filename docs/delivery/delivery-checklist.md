# Paquete maestro y entrega revisable

La entrega externa no está autorizada. El paquete en artifacts/closure es material de QA local, ignorado en Git.

El proceso pnpm release:package selecciona código, manifests y lockfile, cinco migraciones, schema, seed de desarrollo, Dockerfiles, CI, contratos, manuales, matriz y runbooks. Añade SBOM, revisión de licencias, atribuciones y manifiesto SHA-256 por archivo. Excluye .env reales, claves, .git, node_modules, builds, código generado, backups, originales corporativos y PII. El contenido está ordenado; no se promete un archivo comprimido idéntico byte por byte entre ejecuciones.

pnpm release:verify verifica el hash del archivo, extrae en un directorio nuevo, comprueba cada archivo e instala con lockfile congelado. Después genera Prisma, verifica tipos y compila. No necesita una base ni ejecuta seed o migraciones. Los resultados quedan en package-verification.json.

La prueba de cifrado usa GnuPG y AES-256 con texto de demostración y clave efímera en memoria. Verifica descifrado e integridad; no cifra ni entrega datos reales. Para la transferencia, Jurídico y CTO deben aprobar destinatario, formato, cifrado y canal separado de clave. No solicitar claves privadas por chat.

Antes de entrega: confirmar autoridades, línea base, revisión independiente, licencias de npm/imágenes/datasets, tratamiento de datos, proveedores, región, presupuesto, CI remota, imágenes finales, piloto/UAT, medición SLI, recuperación del entorno y relevo humano. Registrar excepciones, riesgos aceptados y condiciones de rollback en [acta](acceptance-record-template.md).

La recepción verifica descifrado, hashes, instalación, build y flujos acordados. Ninguna plantilla constituye firma, cesión, transferencia de privilegios o aceptación.
