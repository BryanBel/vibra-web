# VIBRA: Arquitectura

> Estado: **decidida** (Bryan, 2026-09-06) salvo lo marcado **[por confirmar]**.
> Cada decisión lleva su porqué.

## 1. Forma general

**Monorepo** con pnpm workspaces + Turborepo.

```
vibra-company/
  apps/
    web/          # Sitio público + panel admin en /admin (Astro)
    api/          # Backend único (NestJS)
  packages/
    contracts/    # Contrato oRPC (Zod): fuente única de verdad de la API
    db/           # Esquema Drizzle, migraciones y semilla
    config/       # tsconfig base compartido
  client-assets/  # Manual de marca y material fuente
```

Por qué monorepo: el sitio y la API comparten la definición de qué es un producto, un pedido y un cupón; con los tipos viajando por `contracts`, un cambio de contrato rompe en compilación y no cuando una clienta intenta pagar. El punto de partida era exactamente el problema opuesto — los cuatro productos estaban escritos dos veces dentro del mismo archivo, una en el HTML y otra en el JavaScript.

Por qué el panel **no** es una app aparte: Astro carga las islas por página, así que las páginas públicas no descargan el JavaScript del panel. Un solo despliegue y un solo dominio para un negocio que empieza. Se separa el día que haya varias personas operando con permisos distintos.

## 2. Stack por vertical

| Capa | Elección | Por qué |
|---|---|---|
| Sitio | **Astro 7** con adapter de Netlify, SSR con prerender por ruta | Ya existía en Astro. Las páginas de marca se pre-renderizan; el catálogo va con SSR porque el precio en bolívares cambia a diario y el stock con cada pedido, compensado con `stale-while-revalidate` en el CDN. |
| Panel | **Islas React** dentro de `apps/web/src/pages/admin` | La matriz de variantes, la subida de imágenes y el reordenamiento se vuelven muy pesados en JavaScript plano. Es el patrón que Astro está pensado para servir. |
| Backend | **NestJS 12 + TypeScript** | Módulos, guards de roles y ciclo de vida ya resueltos; convención conocida que facilita sumar gente. |
| ORM / BD | **Drizzle + PostgreSQL 18** | El dominio es relacional puro. Esquema en TypeScript, migraciones versionadas con drizzle-kit y SQL transparente — importante para la transacción de compra, que necesita un `UPDATE ... WHERE stock >= n` atómico que un ORM opaco esconde. |
| API | **oRPC** (`@orpc/nest`): contrato Zod en `packages/contracts`, con OpenAPI generado | Tipos punta a punta sin paso de codegen: el drift entre sitio y API es imposible por construcción. Las URLs siguen siendo REST normales, así que el catálogo se puede cachear en el CDN como cualquier GET. |
| Validación | **Zod**, mismos esquemas en API y sitio | Una sola definición de qué es un pedido válido. Se descartó class-validator porque ata la validación a clases del backend y obliga a repetirla en el cliente. |
| Auth | **JWT propio + argon2**, cookies httpOnly, guard por rol | Solo hay login de administrador: Gillary y quizá una persona más. No hay cuentas de clientes. Better Auth resuelve rotación, recuperación y revocación, pero es una dependencia grande para dos usuarios. |
| Hash de claves | **@node-rs/argon2** | El paquete `argon2` compila con node-gyp y exige las Build Tools de Visual Studio en Windows; este trae binarios precompilados. |
| Imágenes | **Cloudflare R2** [por confirmar: falta crear la cuenta] | Railway tiene sistema de archivos efímero, así que las fotos no pueden vivir con la API. R2 da 10 GB gratis, API compatible con S3 y sin cargo por egreso. |
| Búsqueda | **Full-text de Postgres**, configuración `spanish_unaccent` | Con un catálogo de decenas de piezas, montar Algolia o Meilisearch es infraestructura sin beneficio. Ver §3.7. |
| Infra | **API en Railway · PostgreSQL en Neon · sitio en Netlify** | Ver §7. |

## 3. Decisiones de dominio que se pagan temprano

Baratas ahora, caras después.

**3.1 La fórmula universal partida en dos.** El vocabulario del negocio es *Género → Accesorio → Tipo → Modelo → Tamaño → Color*. Los primeros cuatro niveles identifican el **producto** — lo que tiene página, nombre, descripción y fotos — y los dos últimos identifican la **variante**, que es lo que tiene SKU, precio y existencias. Resulta ser el modelo estándar de comercio electrónico, así que la fórmula de Gillary y el esquema coinciden sin traducción.

**3.2 La taxonomía es data, no código.** Las seis dimensiones son tablas editables desde el panel. Agregar "Earcuff", un color o un tipo de accesorio es una fila, no una migración ni un despliegue. Tipo y modelo cuelgan de su nivel superior con `UNIQUE(category_id, slug)`, así que el panel filtra en cascada y no se puede crear "Collar → Argolla".

**3.3 Las colecciones son otra capa.** La taxonomía dice **qué es** una pieza; las colecciones dicen **cómo se vende**. Son muchas a muchas y se crean y borran sin tocar el catálogo. Es lo que permite que los earcuffs tengan categoría propia — no necesitan perforación, así que son otra necesidad del cliente — y aun así aparezcan junto a los zarcillos en "Para el oído".

**3.4 Los sets eligen cómo llevan inventario.** `set_stock_mode` es `own` cuando Gillary arma cierta cantidad físicamente, o `components` cuando la disponibilidad se deriva de las piezas: el mínimo de `stock / cantidad` entre todas. Así nunca se vende un set cuyo componente se agotó.

**3.5 Los precios se cargan en dólares y los bolívares se derivan.** La conversión usa la tasa del euro del BCV, que es lo que hace el comercio en Venezuela porque va por encima de la del dólar oficial. Tres niveles de respaldo — API, raspado del BCV y última tasa guardada — para que el sitio nunca muestre un precio roto, más una tasa manual que Gillary puede fijar y que gana sobre la automática del mismo día.

**3.6 Los pedidos congelan todo.** `exchange_rate_used`, los precios unitarios y el nombre y SKU de cada línea se guardan como instantánea. Si mañana sube un precio o se archiva un producto, el pedido sigue contando la verdad de cuando se hizo. Las líneas apuntan a la variante con `ON DELETE SET NULL`, no en cascada.

**3.7 La búsqueda vive en Postgres.** `search_text` lo compone la API al guardar, juntando nombre, descripción y los nombres de taxonomía — hace falta porque una columna generada no puede leer filas de otras tablas. De ahí sale `search_vector` con la configuración `spanish_unaccent`, creada en una migración propia que corre antes que cualquier tabla: una columna generada exige una expresión inmutable, y `unaccent()` no lo es, pero una configuración de búsqueda sí. El resultado es que "corazon" encuentra "Corazón".

**3.8 Carrito de invitado, guardado en la base.** Sin cuentas de clientes: el carrito se ata a un token anónimo en cookie httpOnly. Vive en Postgres y no en el navegador, así se recupera al volver y se pueden medir los carritos abandonados.

**3.9 Sin pasarela, pero el pago es concepto de primera clase.** Stripe y PayPal no operan para comercios venezolanos, y las opciones locales exigen RIF jurídico, cuenta empresarial y semanas de trámite. El cliente paga por fuera, reporta la referencia y sube el comprobante; Gillary verifica desde el panel. Como `payment_method` y `payment_status` ya están modelados, enchufar Pago Móvil C2P cuando el volumen lo justifique es agregar un adaptador, no reescribir.

**3.10 El envío nacional no se cobra en el sitio.** Va con flete por cobrar, que el cliente paga al retirar en la agencia. El delivery en Caracas sí cobra, por zona. Punto de encuentro y retiro son gratuitos.

## 4. Entidades núcleo

**Taxonomía:** `Gender` · `Category` (marca los sets) → `AccessoryType` → `Model` · `Size` · `Color`

**Catálogo:** `Product` (los cuatro primeros niveles, con `search_vector`) → `ProductVariant` (SKU, precio, stock) · `ProductImage` · `SetItem` · `Collection` ↔ `ProductCollection`

**Comercio:** `Cart` (token anónimo) → `CartItem` · `DiscountCode` → `DiscountRedemption` · `Order` (instantáneas de montos y tasa) → `OrderItem`

**Operación:** `ExchangeRate` (historial, con marca de ajuste manual) · `DeliveryOption` → `DeliveryZone` · `State` · `StockMovement` (bitácora auditable) · `AdminUser` · `Subscriber` · `ContactMessage`

## 5. Reglas transversales

- **Español** en dominio, comentarios y UI; identificadores en inglés estándar.
- Estados como enums explícitos — pedido, pago, carrito, producto. Nada de booleanos sueltos para lo que es una máquina de estados.
- Todo valor comercial vive en la base y se edita desde el panel: precios, existencias, tarifas de zona, cupones, taxonomía, tasa.
- Los montos de dinero son `numeric`, nunca `float`, y se leen como texto para no perder centavos en el redondeo binario.
- El descuento de stock es atómico: `UPDATE ... SET stock = stock - $n WHERE id = $id AND stock >= $n RETURNING`, sin `SELECT` previo, para que dos clientas simultáneas no compren la misma última pieza.
- Auditoría mínima: quién verificó cada pago y quién ajustó cada existencia, con fecha.
- La cédula es dato personal: se guarda porque el checkout la pide, pero no sale en ninguna respuesta pública de la API.
- El contenido del sitio dice la verdad sobre el negocio. VIBRA selecciona, rediseña y presenta piezas compradas al mayor; no fabrica a mano. Lo pide el propio manual de marca: *"No intentamos parecer algo que no somos"*.

## 6. Orden de construcción

1. ~~Entorno y monorepo~~ ✅
2. ~~Esquema Drizzle completo, migraciones y semilla estructural~~ ✅ — la decisión más importante
3. **API núcleo** (en curso): configuración, base de datos, salud y tasa ✅; faltan auth, taxonomía, colecciones, productos e inventario
4. Panel admin — donde Gillary carga el catálogo real
5. Web pública: componetizar, migrar a Tailwind v4, reescribir el contenido
6. Carrito, cupones, checkout y pedidos
7. Despliegue

## 7. Infraestructura

| Servicio | Rol | Costo aproximado |
|---|---|---|
| **Railway** | API NestJS (proceso Node persistente) | ~$5–20/mes |
| **Neon** | PostgreSQL serverless. Elegido por el **branching**: el branch `development` reemplaza al Postgres local, que no era opción sin Docker en la máquina de desarrollo. Misma región que Railway (us-east) para latencia mínima hacia Venezuela. | $0 → ~$19/mes |
| **Netlify** | Sitio Astro con SSR por adapter | $0 |
| **Cloudflare R2** | Fotos de producto y comprobantes de pago | ~$0 al volumen inicial |
| **Resend** | Correo de confirmación de pedido **[por confirmar]** | $0 hasta 3.000/mes |

Total inicial: **~$5–40/mes**.

## 8. Pendientes

- **[por confirmar]** Tipos y modelos de cada categoría, más allá del ejemplo `Zarcillo → Argolla → Lisa`. Los carga Gillary desde el panel.
- **[por confirmar]** Zonas de delivery en Caracas y su tarifa. No se sembraron valores inventados a propósito: un precio falso es peor que un campo vacío.
- **[por confirmar]** Cuenta de Cloudflare R2 y proveedor de correo.
- **[por confirmar]** Términos y condiciones y política de privacidad, antes de lanzar.
- Respaldos: el free tier de Neon tiene ventana de recuperación corta; conviene un `pg_dump` semanal a R2.
- El manual de marca (`client-assets/vibra.pdf`) todavía describe fabricación artesanal y tote bags cosidas a mano, que era el concepto original. Conviene actualizarlo para que no contradiga al sitio.

## 9. Diagramas

En `docs/diagrams/` (Mermaid, renderizado por GitHub). Regla: el PR que cambia un flujo actualiza su diagrama.
