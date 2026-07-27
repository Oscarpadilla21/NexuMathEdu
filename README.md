# NexuMathEdu

NexuMathEdu es una aplicacion web para gestion educativa con roles de administrador, profesor y estudiante.

## Estructura

- `src/main.jsx`: arranque de React y montaje de la aplicacion.
- `src/App.jsx`: define rutas publicas, protegidas y redireccion por rol.
- `src/contexts/AuthContext.jsx`: estado global de autenticacion y perfil.
- `src/pages/`: pantallas principales para login, perfil, chat y dashboards.
- `src/components/`: componentes reutilizables de interfaz y formularios.
- `src/lib/supabase.js`: cliente central de Supabase.
- `src/lib/chatClient.js`: cliente para consultar el endpoint de chat.
- `src/utils/`: utilidades de roles, grados y presets del chat.
- `supabase/schema.sql`: esquema base de la base de datos.
- `supabase/functions/`: funciones serverless para autenticacion, chat y dashboards.

## Flujo general

1. El usuario inicia sesion y el contexto de autenticacion resuelve su rol.
2. `App.jsx` dirige a la vista correspondiente segun el rol detectado.
3. Los dashboards cargan datos desde Supabase mediante funciones de servidor.
4. La vista de chat guarda conversaciones, mensajes y preferencias por usuario.

## Carga local

Instala dependencias y ejecuta el proyecto con el gestor que prefieras del repositorio.

## Notas

- La base de datos y las funciones del servidor viven dentro de `supabase/`.
- El proyecto usa Vite y React.
