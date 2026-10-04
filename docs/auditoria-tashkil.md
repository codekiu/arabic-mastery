# Revisión del taškīl

La biblioteca contiene 500 lemas y 2.000 ejemplos en árabe fuṣḥā. En esta revisión se comprobaron los 500 lemas y los 2.000 ejemplos con el [servicio en línea Mishkal](https://tahadz.com/mishkal/). Se contrastaron también con [text2tashkeel](https://github.com/TigreGotico/text2tashkeel), un segundo vocalizador. Estos sistemas pueden confundir personas verbales, homógrafos y terminaciones de caso; sus propuestas no se incorporaron sin revisar el contexto y la traducción española.

Los 800 ejemplos de las 200 palabras añadidas se vocalizaron y revisaron frase por frase. Se corrigieron además siete lecturas en el vocabulario anterior y el lema عَلَاقَةٌ (relación). Entre las distinciones comprobadas están حُلْم (sueño) frente a حِلْم (paciencia), مَتْحَف (museo), زُرْتُ (visité) y las formas de سَافَرَ / يُسَافِرُ.

`node verify.mjs` comprueba que todos los vocablos árabes de los lemas y ejemplos tengan harakat, que no se combinen dos vocales incompatibles en una letra, y que se conserven las 500 palabras, sus identificadores y sus cuatro ejemplos. La comparación automática ayuda a detectar errores; no sustituye una revisión editorial por un especialista en árabe.
