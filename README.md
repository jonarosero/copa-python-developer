# Copa Python Developer

Sitio Next.js de competencia por equipos durante ocho semanas. Incluye clasificación general, copas semanales, administración de equipos, integrantes, descripciones y retos con Markdown.

## Funcionalidades

- Cuatro equipos con nombre completo, nombre corto opcional, integrantes y descripción.
- Ocho semanas con actividades editables y puntajes por equipo.
- Editor Markdown con pestañas **Escribir** y **Vista previa**; admite títulos, listas, tablas, enlaces y bloques de código. El HTML incrustado no se ejecuta.
- Al pulsar el nombre de una actividad se abre el enunciado, el tipo de reto, los puntos asignados por equipo y el contador de la próxima competencia.
- Panel visible **Administrar campeonato**, también disponible en `/admin`. Todas las acciones de edición están concentradas ahí.
- Acceso sencillo del organizador mediante la contraseña `1729`.
- Editor Markdown con fuente y vista previa para que el código se lea correctamente.
- Guardado local en el navegador del organizador, sin depender de Cloudflare.
- Nueva imagen de marca: una copa rodeada por una serpiente Python.

## Resultados iniciales

Semana 1: Los Booleanos 15 puntos, Grupo Canela 10, Triple Dinamita 10 y Grupo Otro 0. Semana 2: cinco retos y dos bonus, 115 puntos posibles, inicialmente sin asignar. Semanas 3 a 8 listas para crear actividades.

Los datos iniciales se insertan una sola vez. Cambiar un nombre conserva sus puntos. Los valores de cada actividad reemplazan el puntaje anterior, por lo que guardar de nuevo no duplica puntos. La copa semanal es para el líder único de una semana cerrada; los empates requieren un desempate. La copa final depende del total acumulado al finalizar las ocho semanas. Las copas no añaden puntos.

Las descripciones breves existentes se conservan. El organizador puede ampliarlas con el enunciado completo en Markdown; los integrantes empiezan vacíos para registrar sus nombres reales.

## Requisitos

- Node.js 22.13 o superior.
- pnpm 11.25.0 (versión declarada en `package.json`).
- Git solo si se desea mantener un repositorio o publicar con GitHub.

## Ejecutar en tu computadora

Descomprime el ZIP, abre una terminal en la carpeta `copa-python-developer` y ejecuta:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Abre `http://localhost:3000`. En **Administrar campeonato** usa la contraseña `1729`.

## Edición de contenido

1. Abre **Administrar campeonato**.
2. En **Equipos**, pulsa **Editar** y escribe un integrante por línea, además del nombre y la descripción.
3. Selecciona una semana y pulsa **Actividad** para modificar su enunciado, puntaje y condición de bonus.
4. Redacta en **Escribir**, revisa en **Vista previa** y pulsa **Guardar actividad**.
5. Usa **Puntos** para asignar o corregir puntajes por equipo.
6. Pulsa **Cerrar semana y entregar copa** cuando termine la competencia semanal.

## Archivos principales

- `app/championship.tsx`: interfaz, panel de administración y formularios.
- `app/markdown-text.tsx`: presentación segura de Markdown.
- `app/admin/page.tsx`: entrada directa al panel.
- `app/chatgpt-auth.ts`: identificación e inicio de sesión con ChatGPT.
- `app/api/competition/route.ts`: lectura y guardado del campeonato.
- `lib/competition.ts`: modelos, validación, datos iniciales y cálculos.
- `lib/store.ts`: persistencia y autorización del organizador.
- `db/schema.ts` y `drizzle/`: esquema y migraciones.
- `app/globals.css`: diseño y estilos adaptables.
- `public/python-cup.png`: nuevo emblema, también usado como favicon.

## Publicación en Vercel

1. Crea un repositorio nuevo llamado `copa-python-developer` en GitHub y sube esta carpeta.
2. En Vercel, importa ese repositorio y acepta la configuración detectada para Next.js.
3. Vercel ejecutará `pnpm build` y publicará el sitio.

Los cambios se guardan en el almacenamiento local del navegador que los realizó. Para tener un marcador compartido entre todos los visitantes se debe añadir una base de datos alojada antes de usar el sitio en producción.

## Comprobaciones

```bash
pnpm exec tsc --noEmit
pnpm build
```

## Emblema

El emblema se generó para este proyecto y se encuentra en `public/python-cup.png`.
