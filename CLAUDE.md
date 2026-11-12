# Agenda de citas (SaaS)

## Documentos

- [docs/EPICS.md](docs/EPICS.md): módulos, épicas e historias de usuario con sus criterios de aceptación.
- [docs/STACK.md](docs/STACK.md): tecnologías del proyecto y su estado (**Definido**, **Propuesto**, **Opcional**).

## Flujo de trabajo

El usuario entrega las historias de usuario **una a una** (por ejemplo, `RES-03`). Claude desarrolla cada una de punta a punta, en pasos pequeños y con puntos de aprobación explícitos: Claude propone y el usuario decide.

**Una historia a la vez.** No se empieza otra historia mientras la actual tenga cambios sin commit. Si hay que pausar una historia, primero se deja en un estado coherente y con commit, o se avisa al usuario qué quedó a medias.

1. **Leer la historia.** Ubicarla en [EPICS.md](docs/EPICS.md), revisar sus criterios y los requisitos transversales (sección 4 de EPICS.md), y revisar el código actual. EPICS.md es la única fuente de reglas del producto.
2. **Preguntar antes de suponer.** Si algo no está claro, es ambiguo o falta una regla, preguntar al usuario y esperar su respuesta. Una pregunta a la vez, con la respuesta sugerida. No se inventan reglas de negocio.
3. **Confirmar la tecnología antes de usarla.** Si la historia necesita una tecnología:
   - **Definida** en STACK.md: se usa sin preguntar.
   - **Propuesta u opcional**, o **ausente** de STACK.md: se consulta primero. Se plantea la opción, sus alternativas y una recomendación, y se espera la decisión.

   Una vez decidida, se actualiza STACK.md: la tecnología pasa a **Definido**, o se agrega a la sección de descartadas.
4. **Refinar la historia y esperar aprobación.** Antes de escribir código, presentar una ficha (el formato de la skill `/story`):
   - **Criterios de aceptación** en formato *Dado / Cuando / Entonces*, que describen qué ve o recibe el usuario, nunca cómo se implementa. Salen de los criterios de EPICS.md; si faltan o son vagos, se proponen y el usuario decide.
   - Si hacen falta **más de 3 criterios**, proponer dividir la historia en lugar de inflarla.
   - **Plan** de máximo 5 puntos, sin código: cómo atraviesa las capas con lo mínimo que cumple los criterios.
   - **Fuera de alcance:** lo que no entra, para que no se cuele.
   - **Sugerencias** (decide el usuario): patrones o refactors, solo si hay una señal concreta en el código.

   No se escribe código hasta que el usuario apruebe la ficha.
5. **Aprobar la lista de pruebas.** A partir de los criterios, proponer los nombres de las pruebas (sin escribirlas todavía), dónde se prueba cada una (endpoint, servicio, componente…; preferir el nivel más alto práctico) y cuáles quedan como **verificación manual**. La lista es la especificación: la aprueba el usuario.
6. **Desarrollar en ciclos pequeños.** Una prueba a la vez: escribirla, mostrar que falla, escribir el código mínimo que la hace pasar y mostrar que pasa. Esto incluye la base de datos y las migraciones, el dominio, la API, la UI y los correos que la prueba exija; nada más.
   - El valor esperado de una prueba sale del criterio, nunca se calcula con la misma lógica del código.
   - Se prueba el comportamiento por la interfaz pública, no los detalles internos.
   - Por defecto, Claude avanza hasta que la lista esté en verde y reporta cada prueba que pasó. Si el usuario pide ir paso a paso, se detiene después de cada ciclo.

   **Detenerse y preguntar de inmediato** si:
   - Hace falta una decisión de diseño que no está en el plan.
   - Surge algo que el usuario no pidió, aunque parezca razonable.
   - Para que una prueba pase habría que cambiarla, saltarla o borrarla.
   - Van dos intentos sin llegar a verde.
7. **Verificar.** Correr lint, tipos y pruebas, comprobar el flujo en la app y revisar con el usuario los criterios de verificación manual. Si algo no se pudo verificar, decirlo.
8. **Revisar.** Sugerir al usuario correr `/code-review` (revisa con un contexto limpio; Claude no se autorrevisa). Los refactors se sugieren, el usuario decide, y solo se hacen con las pruebas en verde y nunca mezclados con funcionalidad nueva. Si se tomó una decisión que aplica a todo el proyecto, proponer la línea para este archivo.
9. **Cerrar la historia.** Reportar qué se hizo, cómo se cumple cada criterio de aceptación, las decisiones tomadas y lo que quedó pendiente. Marcar la historia con ✅ en EPICS.md, y también su épica si ya están terminadas todas sus historias MVP (ver "Avance" en EPICS.md). Hacer el commit de la historia (ver "Commits").

Una historia no se da por terminada mientras tenga preguntas abiertas sin respuesta.

## Principios

- **No inventar.** Lo que falta se pregunta, no se rellena.
- **Lo más simple que funcione.** Sin abstracciones, capas ni configuración "para el futuro".
- **Cortes verticales y pequeños.** Cada historia atraviesa todas las capas. La infraestructura (base de datos, autenticación, cron…) se construye dentro de la primera historia que la necesita, no como una historia técnica aparte.
- **Sugerir, no decidir.** Patrones, refactors y alcance los decide el usuario.

## Idioma

| Qué | Idioma |
|---|---|
| Código: nombres de archivos y carpetas, componentes, funciones, variables, tipos, tablas, columnas, rutas de la API, códigos de error y comentarios | Inglés |
| Mensajes de commit, nombres de ramas y de jobs de CI | Inglés |
| Texto que ve el usuario final: etiquetas, botones, mensajes, correos (por ejemplo, "Iniciar sesión") | Español |
| Documentos de `docs/`, `CLAUDE.md` y el chat con el usuario | Español |

Las rutas que ve el usuario en el navegador siguen el producto: `/panel`, `/login`, `/registro` y `/{slug}` (EPICS.md).

## Commits

Todo commit se hace con la skill `/anthropic-skills:sncommit`, nunca con `git commit` a mano. Los mensajes van en inglés y no llevan la línea `Co-Authored-By` ni otra atribución a Claude.

- **Un commit por unidad lógica**, con las pruebas en verde: nunca dos historias mezcladas en el mismo commit, y la funcionalidad y los refactors en commits separados.
- `sncommit` hace push a `main`, y el push a `main` despliega a producción (ver STACK.md). Por eso el commit se hace solo después de verificar (paso 7) y de que el usuario haya revisado.
