# Arabic Mastery

500 palabras con 4 ejemplos bilingües cada una. Funciona como web, HTML sin conexión y aplicación de escritorio con Tauri 2.

## Estudiar

1. En **Mis listas**, crea una lista con un nombre.
2. En **Biblioteca**, elige en la barra «Añadiendo a» la lista y añade palabras una a una o un tema completo con «Añadir las N».
3. Desde la lista, elige una sesión de 10, 20 o todas las palabras y la dirección de las flashcards. Pulsa **Estudiar**, intenta recordar antes de mostrar la respuesta y elige **Repetir**, **Difícil** o **La recuerdo**.
4. Usa **Hacer examen** para responder preguntas de opción múltiple y repasar los fallos. Los últimos resultados quedan guardados en la lista.
5. **Exportar para Anki (CSV)** produce dos columnas: anverso y reverso. Al importar, selecciona coma como separador y permite HTML. No hay fila de encabezados. Cada reverso incluye los cuatro ejemplos.
6. En **Ajustes**, guarda una copia JSON con todas las listas, resultados de exámenes y fechas de repaso. Elige dónde guardarla en la app de escritorio o en navegadores compatibles; en los demás navegadores se descarga el archivo. Al importar una copia, puedes restaurar todos los datos de ese archivo o añadirlos a los actuales. Una copia antigua de la aplicación sigue siendo compatible.

**Inicio** muestra una sola acción principal según tu situación (elegir palabras, repasar pendientes o estudiar las nuevas) y tus listas con Estudiar y Examen directos. Renombrar, exportar y eliminar una lista están en su menú •••. **Progreso** muestra próximos repasos y resultados reales. No incluye puntos, premios ni rachas.

En la Biblioteca, **Mostrar ejemplos / Ocultar ejemplos** despliega o pliega los cuatro ejemplos de todas las palabras de la vista. El modo oscuro se cambia con el icono junto a **Ajustes** o desde la página de Ajustes. Ambos ajustes se conservan localmente al volver a abrir la web o la app.

Los intervalos de repaso son una heurística de 1, 3, 7, 14 y 30 días; no un algoritmo adaptativo validado. Consulta [la investigación y decisiones de diseño](docs/diseno-ux.md).

Las listas se guardan localmente. No se sincronizan automáticamente entre la app, la web ni dispositivos. Guarda una copia para trasladarlas o conservar un respaldo.

## Descargar la aplicación

Los instaladores para macOS (Apple Silicon e Intel) y Windows están en [GitHub Releases](https://github.com/codekiu/arabic-mastery/releases/latest). Elige el archivo `.dmg` para tu Mac o el instalador `.exe` para Windows. Las versiones distribuidas no están firmadas con certificados comerciales; el sistema puede pedirte que confirmes la apertura.

## Aplicación Mac

Abre `Vocabulario árabe.app`. Funciona sin conexión y usa un diálogo nativo para guardar CSV y copias JSON. Esta compilación local es para Apple Silicon; no está notarizada para distribución pública.

## Desarrollo

Requiere Python 3, Node.js, Rust y las herramientas de desarrollo de macOS.

- `npm install`
- `npm run build`
- `node verify.mjs && node verify_study.mjs`
- `npm run desktop:build`

La aplicación se genera en `src-tauri/target/release/bundle/macos/`. Los archivos `vocab_extra.tsv`, `vocab_200.tsv` y `vocab_additional.tsv` contienen el vocabulario añadido, organizado por tema. El archivo HTML de `dist/` incorpora todos los datos y recursos necesarios.
