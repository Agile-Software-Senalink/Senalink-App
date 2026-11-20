# SeñaLink

PWA para la comunicación en ventanilla entre personas sordas (LSP) y agentes de atención.
No tiene backend: todo corre en el navegador y la imagen de la cámara nunca sale del dispositivo.

## Cómo correrla

```bash
npm start
```

Abre http://localhost:8080. La cámara solo funciona en `localhost` o con HTTPS.

Pruebas de la lógica (sin navegador):

```bash
npm test
```

## Cómo agregar las señas entrenadas

1. Entrena las señas en `senalink-spike` (`npm run dev`) y exporta el modelo (Aún tenemos el spike en local, no subido a repositorio por ahora)
2. Copia los 3 archivos en `models/senalink/` con estos nombres exactos:
   - `senalink-modelo.json`
   - `senalink-modelo.weights.bin`
   - `senalink-modelo-etiquetas.json` 
3. Recarga la app. En Ajustes (engranaje) aparece la lista de señas cargadas.

- Graba una clase **Nada** (manos quietas o sin seña): la app la usa como reposo.
- Si una seña nueva no tiene frase propia, se muestra con su nombre. Las frases se editan en `js/signs.js` (`PHRASES`).
- El modelo debe recibir 20 cuadros × 88 valores (2 manos). Si no coincide, la app avisa que hay que reentrenar.

## Pantallas e historias de usuario

| Pantalla | HU |
|---|---|
| Atención: señas → texto + voz | HU01 |
| Seña no reconocida (aviso y frases de respaldo) | HU01 |
| Atención: voz del agente → texto (micrófono) | HU02 |
| Respuestas rápidas con íconos | HU03 |
| Respuesta: texto grande y contraste | HU04 |
| Fin: mensaje de cierre | HU05 |

## Cómo funciona el reconocimiento

1. MediaPipe HandLandmarker detecta hasta 2 manos (21 puntos cada una).
2. Se toma el último segundo de movimiento (20 cuadros) con la misma extracción usada para entrenar.
3. El modelo de TensorFlow.js decide la seña. Se acepta si supera la confianza mínima (85 %, ajustable) dos veces seguidas.
4. Si hay manos pero no hay confianza por ~1,5 s, se muestra «No entendí la seña».

