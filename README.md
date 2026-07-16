# Gestión Disciplinaria — Demo

Demo de la vista de tienda (Dashboard + Reportar caso) del sistema de gestión disciplinaria.

## Cómo desplegarlo en Vercel (sin usar terminal)

1. Sube esta carpeta a un repositorio de GitHub:
   - Crea un repositorio nuevo (puede ser privado) en https://github.com/new
   - Sube todos estos archivos ahí (arrastra y suelta en la web de GitHub, o usa GitHub Desktop)

2. Ve a https://vercel.com y entra con tu cuenta (puedes usar tu cuenta de GitHub para loguearte)

3. Click en **"Add New" → "Project"**

4. Selecciona el repositorio que acabas de subir

5. Vercel detecta automáticamente que es un proyecto Vite — no cambies nada, solo click **"Deploy"**

6. En 1-2 minutos te da un link tipo `https://tu-proyecto.vercel.app` — ese es el que le mandas al cliente

## Alternativa sin GitHub (más rápida)

1. Instala Vercel CLI: `npm i -g vercel`
2. Dentro de esta carpeta, corre: `vercel`
3. Sigue las preguntas (acepta los valores por defecto)
4. Te da el link de producción al terminar

## Correrlo localmente antes de subirlo (opcional, para probarlo tú primero)

```
npm install
npm run dev
```

Esto abre el demo en tu navegador en `http://localhost:5173`
