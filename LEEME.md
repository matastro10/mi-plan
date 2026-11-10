# Mi Plan 🏄‍♂️

App para seguir tu plan de alimentación todos los días. Se instala en el iPhone desde Safari, funciona sin internet y guarda todo en tu teléfono (sin cuentas ni servidor).

## Qué hay en esta carpeta

| Archivo | Para qué sirve |
| --- | --- |
| `index.html`, `css/`, `js/` | La app |
| `data/plan.json` | **Tu plan.** Si tu nutrióloga cambia algo, solo se edita este archivo |
| `data/frases.json` | Las frases de guerrero (mañana, comidas, noche, hambre y generales) |
| `data/config.json` | Horario de las notificaciones (de 8:00 a 22:00, hora de Buenos Aires) |
| `sw.js`, `manifest.json`, `icons/`, `fuentes/` | Lo que la hace instalable y que abra sin internet |
| `push/` y `.github/workflows/frases.yml` | El robot de GitHub que manda una frase cada hora |

---

## 1. Publicarla gratis con GitHub Pages

**Lo más fácil:** abre esta carpeta en Claude Code y dile: *"sube esta carpeta a un repositorio público nuevo de GitHub llamado mi-plan y activa GitHub Pages en la rama main"*.

**A mano, desde el navegador de tu Mac:**

1. Crea una cuenta en [github.com](https://github.com) (gratis) y entra a [github.com/new](https://github.com/new).
2. Nombre del repositorio: `mi-plan`. Déjalo en **Public** y toca **Create repository**.
3. En la página que sale, toca el enlace **uploading an existing file**.
4. Abre esta carpeta en Finder, selecciona **todo lo de adentro** (no la carpeta en sí) y arrástralo a la página. Espera a que suba y toca **Commit changes**.
5. Falta un archivo que Finder esconde. En el repositorio toca **Add file → Create new file** y:
   - en el nombre escribe exactamente `.github/workflows/frases.yml`
   - abre `push/workflow-frases.yml` de esta carpeta, copia todo y pégalo ahí
   - toca **Commit changes**.
6. Ve a **Settings → Pages**. En *Source* elige **Deploy from a branch**, rama **main**, carpeta **/ (root)** y toca **Save**.
7. Espera 1 o 2 minutos. Tu app queda en `https://TU-USUARIO.github.io/mi-plan/`.

> El repositorio es público: cualquiera con el enlace puede ver los archivos. Por eso tu nombre y el de tu nutrióloga **no** van en los archivos: los escribes en la app (Ajustes) y se quedan solo en tu teléfono.

## 2. Instalarla en el iPhone

1. Abre tu enlace en **Safari** (tiene que ser Safari).
2. Toca **Compartir** (el cuadro con la flecha) → **Agregar a inicio** → **Agregar**.
3. Ábrela desde su ícono. Ya funciona sin internet.

## 3. Activar las frases cada hora

Se hace una sola vez. Necesitas iOS 16.4 o más nuevo y abrir la app **desde su ícono**.

1. En la app: **Ajustes → Frases cada hora → Activar frases en este teléfono** y acepta el permiso.
2. La app te muestra 3 valores con botón **Copiar**. En GitHub ve a **Settings → Secrets and variables → Actions → New repository secret** y crea uno por cada valor, con estos nombres exactos:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `PUSH_SUBSCRIPTION`
3. Prueba: en GitHub abre **Actions → Frases de guerrero → Run workflow → Run workflow**. En menos de un minuto te llega una notificación de prueba.
4. Cuando ya te llegó, en la app toca *"Ya guardé la clave privada en GitHub: bórrala de este teléfono"*.

Desde ahí, GitHub te manda una frase cada hora de 8:00 a 22:00: la primera es de arranque, a la hora de cada comida llega su recordatorio y la última es de cierre. No se repiten en el mismo día.

Cosas buenas de saber:

- **Pueden llegar unos minutos tarde.** GitHub no es exacto con la hora; es normal.
- **Si dejas de recibirlas un día:** abre **Actions** en GitHub. Si dice que la suscripción caducó, activa otra vez en la app, copia `PUSH_SUBSCRIPTION` y actualiza ese secreto.
- **Si pasan 60 días sin ningún cambio en el repositorio**, GitHub pausa el robot. Entra a **Actions**, elige *Frases de guerrero* y toca **Enable workflow**.
- **Horario:** se cambia en `data/config.json` (`horaInicio` y `horaFin`, en formato de 24 horas).

### Plan B: la app ntfy

Si las notificaciones de la app te dan lata:

1. Instala **ntfy** desde la App Store.
2. Suscríbete a un tema con un nombre difícil de adivinar, por ejemplo `miplan-k7x2q9-frases` (quien sepa el nombre puede leerlo).
3. En GitHub crea el secreto `NTFY_TOPIC` con ese mismo nombre.

Las frases te llegan por ntfy. Si también tienes los otros 3 secretos, llegan por los dos lados.

## 4. Cambiar cosas después

- **El plan:** edita `data/plan.json` en GitHub (ícono del lápiz) y guarda. En la app: **Ajustes → Buscar cambios del plan**.
- **Las frases:** en **Ajustes → Mis frases** agregas, quitas y marcas favoritas. Eso cambia la frase del día de la app. Para que también cambien las notificaciones: **Copiar lista para GitHub** y pega todo en `data/frases.json`.
- **Respaldo:** **Ajustes → Exportar** guarda un archivo con tu historial. Con **Importar** lo recuperas (por ejemplo, si cambias de teléfono).

## 5. Probarla en tu Mac antes de publicarla

En la Terminal, dentro de esta carpeta:

```
python3 -m http.server 8000
```

y abre `http://localhost:8000` en el navegador. (Abrir `index.html` con doble clic no funciona: necesita ese mini servidor.)

Para ver qué frases tocan hoy, hora por hora: `cd push && npm install && npm run agenda`.

## Si algo no sale

| Qué pasa | Qué hacer |
| --- | --- |
| El enlace da error 404 | Espera 2 minutos y revisa **Settings → Pages** (rama main, carpeta root) |
| No aparece "Activar frases" | Abre la app desde su ícono de la pantalla de inicio, no desde Safari |
| "Las notificaciones están bloqueadas" | Ajustes del iPhone → Notificaciones → Mi Plan → permitir |
| La prueba de GitHub sale en rojo | Ábrela: el mensaje dice qué secreto está mal copiado |
| No veo mis cambios del plan | Ajustes → Buscar cambios del plan; o cierra y abre la app dos veces |
| Edité `plan.json` y la app dice que tiene un error | Falta una coma o unas comillas. La app sigue usando la última versión buena mientras lo arreglas |

---

Tipografías: Shrikhand y Nunito (licencia SIL Open Font License). Ilustraciones e ícono hechos para esta app.
