# Dashboard Financiero Dinámico (estilo BCR)

Réplica dinámica del dashboard de **Indicadores Financieros del Sistema Financiero**, con:
- **Dashboard público** (`/`) — gráficos renderizados en tiempo real desde la base de datos.
- **Panel admin** (`/admin`) — formulario campo por campo, protegido con contraseña.
- **Backend** Node.js + Express + PostgreSQL.

---

## 🚀 Despliegue en Railway

### 1. Subir el código a GitHub
```bash
git init
git add .
git commit -m "Dashboard financiero"
git remote add origin <tu-repo>
git push -u origin main
```

### 2. Crear el proyecto en Railway
1. En Railway: **New Project → Deploy from GitHub repo** y selecciona este repo.
2. **New → Database → PostgreSQL** (Railway crea la variable `DATABASE_URL` automáticamente).
3. En el servicio web, ve a **Variables** y agrega:

| Variable | Valor |
|---|---|
| `ADMIN_PASSWORD` | tu contraseña para el panel admin |
| `SESSION_SECRET` | una cadena larga aleatoria |
| `NODE_ENV` | `production` |

> `DATABASE_URL` y `PORT` los inyecta Railway automáticamente.

### 3. Listo
Al desplegar, el comando `npm run init-db` crea la tabla e inserta los datos de Abril 2026. Luego arranca el servidor.

- Dashboard: `https://tu-app.up.railway.app/`
- Admin: `https://tu-app.up.railway.app/admin`

---

## 💻 Correr en local

```bash
npm install
# crea un archivo .env basado en .env.example
npm run init-db   # solo la primera vez
npm start
```
Abre `http://localhost:3000`.

---

## 🗂 Estructura

```
├── server.js          # Servidor Express + API + auth
├── db/init.js         # Crea tabla e inserta datos iniciales
├── public/
│   ├── index.html     # Dashboard público (gráficos SVG nativos)
│   └── admin.html     # Panel de edición
├── railway.json       # Config de despliegue
└── package.json
```

## 🔌 API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/data` | Devuelve todos los datos del dashboard (público) |
| `POST` | `/api/data` | Guarda los datos (requiere sesión admin) |
| `POST` | `/admin/login` | Login `{ password }` |
| `POST` | `/admin/logout` | Cierra sesión |

## 🎨 Notas de diseño
- Todo el estado se guarda como un único documento **JSONB** → puedes agregar/quitar tipos de depósito o sectores sin migraciones.
- Los gráficos (donut, pie, barras) se dibujan con **SVG nativo**, sin librerías externas → carga rápida.
- Diseño responsive; los colores y la paleta azul replican el original del BCR.
