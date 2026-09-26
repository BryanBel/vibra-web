[English](README.md) | **Español**

# Vibra

Tienda de **Vibra**, marca venezolana de cadenas de mano hechas a mano — pulsera y anillo
unidos por una cadena, que se llevan sobre el dorso.

**En vivo en [vibracompany.netlify.app](https://vibracompany.netlify.app)**

![La tienda de Vibra](docs/home.webp)

## Dos ramas, dos etapas

`main` tiene el sitio que está publicado: una tienda de una página en Astro, con el sistema
tipográfico y cromático construido a partir de la identidad que entregó la clienta.

[`feat/monorepo-api`](https://github.com/BryanBel/vibra-web/tree/feat/monorepo-api) tiene
hacia dónde va — una tienda de verdad, con catálogo, inventario, pedidos y panel de
administración, en lugar de una página que lista cuatro productos.

El punto de partida era el problema en miniatura: esos cuatro productos estaban escritos
dos veces en el mismo archivo, una en el HTML y otra en el JavaScript. Todo lo que sigue
sale de no querer repetir eso.

## El monorepo

```
apps/
  web/          # sitio público + panel en /admin (Astro)
  api/          # backend NestJS
packages/
  contracts/    # contrato oRPC en Zod — fuente única de verdad de la API
  db/           # esquema Drizzle, migraciones y semilla
  config/       # tsconfig base compartido
```

| Capa | Elección | Por qué |
| ---- | -------- | ------- |
| Sitio | [Astro](https://astro.build) 7, SSR con prerenderizado por ruta | Las páginas de marca se pre-renderizan; el catálogo va en servidor porque el precio en bolívares cambia a diario y el stock con cada pedido |
| Panel | Islas de React dentro de `apps/web/src/pages/admin` | Una matriz de variantes, la subida de imágenes y el reordenamiento se vuelven pesados en JavaScript plano. Astro carga las islas por página, así que las públicas no descargan nada de eso |
| Backend | [NestJS](https://nestjs.com) 12 | Módulos, guards de rol y ciclo de vida ya resueltos, con una convención que otra persona reconocería |
| Base de datos | [Drizzle](https://orm.drizzle.team) sobre PostgreSQL 18 | El dominio es relacional puro. Esquema en TypeScript, migraciones versionadas y SQL legible — que la compra necesita, porque depende de un `UPDATE … WHERE stock >= n` atómico que un ORM opaco esconde |
| API | [oRPC](https://orpc.unnoq.com) con contrato Zod y OpenAPI generado | Tipos punta a punta sin paso de codegen: el desfase entre sitio y API es imposible por construcción, y las URLs siguen siendo REST normales, así que el catálogo se cachea igual en el CDN |
| Autenticación | JWT propio + argon2, cookies httpOnly, guard por rol | No hay cuentas de clientas, solo un acceso de administración para una o dos personas. Una librería completa de auth es mucha dependencia para dos usuarios |
| Búsqueda | Full-text de PostgreSQL, `spanish_unaccent` | Para un catálogo de decenas de piezas, montar Algolia o Meilisearch es infraestructura sin beneficio |

[`ARCHITECTURE.md`](https://github.com/BryanBel/vibra-web/blob/feat/monorepo-api/ARCHITECTURE.md)
en esa rama tiene el razonamiento completo, incluidas las decisiones que siguen abiertas.

## Ejecutar el sitio

```sh
pnpm install
pnpm dev        # http://localhost:4321
```

## Sobre el material de marca

El PDF de identidad, la fotografía original y los archivos fuente de la clienta están
deliberadamente fuera del repositorio. Son unos 54 MB que la construcción nunca lee, y son
material de la clienta, no código. Las fotos que el sitio sí muestra están versionadas y
optimizadas en `public/`.

---

Hecho por Bryan Belandria — [github.com/BryanBel](https://github.com/BryanBel)
