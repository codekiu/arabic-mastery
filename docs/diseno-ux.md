# Arabic Mastery: investigación y decisiones de UX

Fecha: 1 de octubre de 2026. Alcance: aplicación de escritorio Tauri 2 y web; 300 entradas y 1200 ejemplos existentes.

## Fuentes analizadas

| Fuente | Hallazgo que orienta el diseño | Aplicación concreta |
|---|---|---|
| [Kim y Webb, 2022: metaanálisis de práctica espaciada en segundas lenguas](https://onlinelibrary.wiley.com/doi/10.1111/lang.12479) | La distribución temporal de la práctica importa en el aprendizaje de una segunda lengua. | Cola de palabras pendientes de repaso y fechas de próxima revisión. |
| [Duolingo: spaced repetition](https://blog.duolingo.com/spaced-repetition-for-learning/) | Combinar repasos distribuidos, recuperación activa y una revisión más cercana de los errores. | Flashcards que ocultan la respuesta, botones de dificultad y repaso de fallos. |
| [The Learning Scientists: retrieval practice](https://www.learningscientists.org/blog/2016/6/23-1) | Intentar recuperar lo aprendido y comprobar después la respuesta ayuda a detectar errores. | Una pregunta por pantalla; corrección y ejemplos después de responder. |
| [NN/g: progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Reservar las funciones avanzadas para un segundo nivel reduce la complejidad inicial. | Exportación, copias y gestión en Ajustes o en el menú de una lista. Los cuatro ejemplos se abren desde la ficha de una palabra. |
| [NN/g: recognition and recall](https://www.nngroup.com/articles/recognition-and-recall/) | Los controles deben reconocerse fácilmente, sin exigir memorizar cómo navegar. | Navegación persistente con etiquetas, estados visibles y atajos secundarios. La recuperación de vocabulario se exige dentro del ejercicio. |

Estas fuentes orientan el producto; no son pruebas de eficacia de esta aplicación. Los intervalos concretos son una heurística transparente de 1, 3, 7, 14 y 30 días, no un algoritmo adaptativo validado. Un fallo vuelve a programar la palabra para el día siguiente; la sesión ofrece repetirla inmediatamente. Un acierto de opción múltiple no aumenta el nivel de recuerdo de una flashcard.

## Diagnóstico de la versión anterior

- La colección mostraba 1200 frases a la vez: explorar y estudiar compartían una pantalla muy larga.
- Crear, renombrar, eliminar, exportar e importar competían con empezar a estudiar.
- El progreso se limitaba a la última sesión y no indicaba qué repasar después.
- El diseño servía para un documento interactivo, pero carecía de una estructura clara de aplicación.

## Arquitectura de información

1. **Inicio:** recomendación útil según las listas y los repasos pendientes; acceso directo a las listas y a la biblioteca.
2. **Biblioteca:** buscar, filtrar por tipo/tema, consultar cuatro ejemplos y añadir a una lista.
3. **Mis listas:** elegir o crear una lista, seleccionar palabras y configurar una sesión corta.
4. **Progreso:** próximos repasos y resultados reales de exámenes.
5. **Ajustes:** respaldo e importación; explicación del almacenamiento local.

Las sesiones sustituyen el contenido principal. Se muestra una palabra o pregunta, el avance y la salida. Las flashcards admiten ambas direcciones y valoración «Repetir», «Difícil» y «La recuerdo». Los exámenes tienen opciones múltiples y explicación después de responder.

## Lenguaje visual

Paleta azul pizarra de baja saturación (#305f8c) sobre gris frío claro, con un acento ámbar para lo pendiente. En modo oscuro, fondo gris azulado (#12171e) en lugar de negro puro, texto gris claro (#e2e8ef) en lugar de blanco puro y un azul desaturado (#9dbbe0) como acento, para reducir el deslumbramiento y la vibración del texto, siguiendo las pautas de tema oscuro de Material Design. Tipografía del sistema para que la app funcione sin conexión. Árabe en un tamaño generoso y dirección RTL aislada; español en líneas independientes LTR. Bordes discretos, sombras contenidas y espaciado coherente. Iconos acompañados de texto. No se usan premios, cifras de progreso inventadas ni rachas con penalizaciones.

## Accesibilidad y continuidad

Controles nativos, foco visible, etiquetas de formularios, mensajes de estado y opciones correctas/incorrectas identificadas con texto además de color. Navegación adaptable a ventanas estrechas. Atajos de teclado sólo dentro de sesiones y fuera de campos editables. Respeto por movimiento reducido.

Se conserva el identificador de cada palabra y la clave del almacenamiento de la versión anterior. Las listas y resultados existentes migran con valores por defecto para los nuevos campos. Las copias anteriores siguen admitidas. Importar añade listas y fusiona el progreso, sin borrar las listas actuales. No hay sincronización automática ni envío de datos de estudio a un servidor.
