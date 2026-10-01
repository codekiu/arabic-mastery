# Vocabulario árabe

300 palabras con 4 ejemplos bilingües cada una. Funciona como web, HTML sin conexión y aplicación de escritorio con Tauri 2.

## Estudiar

1. En **Mis listas**, crea una lista con un nombre.
2. En **Vocabulario**, selecciona la lista y añade palabras.
3. Usa **Flashcards** para recordar el significado y marcar lo que necesitas repetir.
4. Usa **Hacer examen** para responder preguntas de opción múltiple y repasar los fallos. Los últimos resultados quedan guardados en la lista.
5. **Exportar para Anki (CSV)** produce dos columnas: anverso y reverso. Al importar, selecciona coma como separador y permite HTML. No hay fila de encabezados. Cada reverso incluye los cuatro ejemplos.
6. **Guardar copia de mis listas** guarda un JSON. **Importar copia** añade esas listas sin borrar las existentes. La web también permite copiar el contenido cuando el navegador no puede descargar archivos.

Las listas se guardan localmente. No se sincronizan automáticamente entre la app, la web ni dispositivos. Guarda una copia para trasladarlas o conservar un respaldo.

## Aplicación Mac

Abre `Vocabulario árabe.app`. Funciona sin conexión y usa un diálogo nativo para guardar CSV y copias JSON. Esta compilación local es para Apple Silicon; no está notarizada para distribución pública.

## Desarrollo

Requiere Python 3, Node.js, Rust y las herramientas de desarrollo de macOS.

- `npm install`
- `npm run build`
- `node verify.mjs && node verify_study.mjs`
- `npm run desktop:build`

La aplicación se genera en `src-tauri/target/release/bundle/macos/`. Los archivos `vocab_extra.tsv` y `vocab_200.tsv` contienen el vocabulario añadido, organizado por tema. El archivo HTML de `dist/` incorpora todos los datos y recursos necesarios.
