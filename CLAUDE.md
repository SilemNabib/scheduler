# Agenda de citas (SaaS)

## Documentos

- [docs/EPICS.md](docs/EPICS.md): módulos, épicas e historias de usuario con sus criterios de aceptación.
- [docs/STACK.md](docs/STACK.md): tecnologías del proyecto y su estado (**Definido**, **Propuesto**, **Opcional**).

## Flujo de trabajo

El usuario entrega las historias de usuario **una a una** (por ejemplo, `RES-03`). Claude desarrolla cada una de punta a punta.

1. **Leer la historia.** Ubicarla en [EPICS.md](docs/EPICS.md) y revisar sus criterios y referencias.
2. **Preguntar antes de suponer.** Si algo no está claro, es ambiguo o falta una regla, preguntar al usuario y esperar su respuesta. No se inventan reglas de negocio.
3. **Confirmar la tecnología antes de usarla.** Si la historia necesita una tecnología:
   - **Definida** en STACK.md: se usa sin preguntar.
   - **Propuesta u opcional**, o **ausente** de STACK.md: se consulta primero. Se plantea la opción, sus alternativas y una recomendación, y se espera la decisión.

   Una vez decidida, se actualiza STACK.md: la tecnología pasa a **Definido**, o se agrega a la sección de descartadas.
4. **Desarrollar de punta a punta.** Esto incluye la base de datos y las migraciones, el dominio, la API, la UI, los correos si aplica, y las pruebas que exigen los criterios.
5. **Verificar.** Correr lint, tipos y pruebas, y comprobar el flujo en la app. Si algo no se pudo verificar, decirlo.
6. **Cerrar la historia.** Reportar qué se hizo, cómo se cumple cada criterio de aceptación, las decisiones tomadas y lo que quedó pendiente.

Una historia no se da por terminada mientras tenga preguntas abiertas sin respuesta.

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
