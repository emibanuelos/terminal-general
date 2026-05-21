# 🖥️ Terminal General — Trading Dashboard

Dashboard web local para registrar, comparar y gestionar estrategias de trading algorítmico, portfolios y cuentas de fondeo/broker.

## 📸 Características

- 📊 Dashboard de estrategias con 9+ métricas (Profit Factor, Max DD, DD Monte Carlo, Win Rate, etc.)
- 📈 Comparar hasta 10 estrategias side-by-side
- 📁 Portfolios con métricas calculadas automáticamente
- 💰 Gestión de cuentas (Fondeo, Broker, Darwinex Zero, Demo)
- 📅 Registro semanal de resultados por cuenta
- 💾 Datos guardados en localStorage del navegador
- 📤 Export CSV y JSON / Import JSON

## 🌐 Usar Online

👉 [https://emibanuelos.github.io/terminal-general/](https://emibanuelos.github.io/terminal-general/)

## 📥 Descargar y Usar Localmente

### Opción 1: Descargar ZIP (más fácil)

1. Click en el botón verde **"Code"** arriba
2. Click en **"Download ZIP"**
3. Descomprime el archivo
4. Abre `index.html` en tu navegador

### Opción 2: Clonar con Git

```bash
git clone https://github.com/emibanuelos/terminal-general.git
cd terminal-general
open index.html
```

## 🚀 Cómo Empezar

1. Abre `index.html` en tu navegador (Chrome recomendado)
2. Haz clic en "Cargar Datos de Ejemplo" para ver una demo
3. O empieza a agregar tus propias estrategias con el botón "+"

## 📁 Archivos

| Archivo | Descripción |
|---------|-------------|
| `index.html` | Página principal |
| `styles.css` | Tema oscuro premium |
| `data.js` | Manejo de datos y localStorage |
| `app.js` | Lógica de dashboard y comparación |
| `mod-portfolios.js` | Módulo de portfolios |
| `mod-accounts.js` | Módulo de cuentas |
| `mod-weekly.js` | Módulo de registro semanal |

## ⚠️ Notas

- No requiere servidor ni instalación — solo abre el HTML
- Los datos se guardan en el navegador (localStorage)
- Cada navegador/dispositivo tiene sus propios datos independientes
- Usa **Export JSON** para hacer backup de tus datos

## 📄 Licencia

MIT
