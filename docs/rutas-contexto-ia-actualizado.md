# Contexto de Arquitectura, Rutas y Servicios (Actualizado v1.1) — NexuMathEdu

> **Documentación Técnica de Rutas y Servicios para Entornos IA y Desarrollo**  
> **Fecha:** Septiembre de 2026  
> **Versión:** 1.1.0 (Optimizada AGY)  
> **Diagrama Interactivo Generado con Archify:** [`docs/arquitectura-y-rutas-interactivo.html`](file:///C:/Users/Oscar%20Padilla/Documents/GitHub/NexuMathEdu/docs/arquitectura-y-rutas-interactivo.html)

---

## 1. Stack Tecnológico Consolidado

| Capa | Tecnología | Versión | Rol en el Sistema |
| :--- | :--- | :--- | :--- |
| **Frontend SPA** | React + React Router DOM | v19.2 + v7.15 | Aplicación web reactiva con enrutamiento declarativo y RBAC |
| **Herramienta de Build** | Vite + Rolldown | v8.0.12 | Compilación ultrarrápida (1.20s) y soporte HMR en desarrollo |
| **Estilos & UI** | Tailwind CSS + Lucide Icons | v4.2 + v1.14 | Sistema de diseño responsivo y catálogo de iconografía |
| **Matemáticas & Visualización** | KaTeX + Mathjs + ApexCharts | v0.18 + v15.2 + v5.13 | Renderizado de fórmulas $\LaTeX$, cálculo numérico y gráficos de analítica |
| **Hosting & CDN** | Cloudflare Pages (Wrangler) | v4.95 | Servido estático con soporte de fallback para Single Page Applications |
| **Backend & Base de Datos** | Supabase (PostgreSQL + Auth) | v15+ / Auth JWT | Base de datos relacional con RLS `InitPlan` Caching y 11 índices B-Tree |
| **Lógica Serverless** | Supabase Edge Functions | Deno Runtime | Funciones de backend con permisos elevados (`service_role`) |
| **Modelos de IA** | Groq & Cerebras APIs | Llama 3.1 & GPT-OSS | Inferencia ultrarrápida (<400ms) para tutoría y apoyo docente |
| **Entorno de Desarrollo** | Google Antigravity (AGY) + Archify | AGY Platform + Archify v2.17 | Pair-programming agéntico y generación de diagramas interactivos validados |

---

## 2. Roles del Sistema y Matriz de Permisos

| Rol | Identificador | Alcance Operativo | Redirección por Defecto |
| :--- | :---: | :--- | :---: |
| **Administrador** | `admin` | Control total de usuarios, asignaciones masivas de profesores/cursos y analítica institucional | `/admin` |
| **Profesor** | `teacher` | Gestión de materias asignadas, creación de alumnos, planilla de calificaciones y chat didáctico | `/teacher` |
| **Estudiante** | `student` | Consulta de notas periódicas (P1, P2, P3, PF) y tutoría socrática interactiva con KaTeX | `/student` |

---

## 3. Rutas del Frontend (`React Router DOM v7`)

Todas las rutas están protegidas por el componente de control de sesión [`AuthContext.jsx`](file:///C:/Users/Oscar%20Padilla/Documents/GitHub/NexuMathEdu/src/contexts/AuthContext.jsx) y encapsuladas por [`ErrorBoundary.jsx`](file:///C:/Users/Oscar%20Padilla/Documents/GitHub/NexuMathEdu/src/components/ErrorBoundary.jsx):

| Ruta Frontend | Componente Asociado | Nivel de Acceso | Funcionalidad Principal |
| :--- | :--- | :---: | :--- |
| `/login` | `Login.jsx` | Público | Autenticación con correo y contraseña. Validación inmediata de rol |
| `/` | `roleRoutes.js` | Autenticado | Redirección dinámica automática según el rol asignado al usuario |
| `/admin` | `AdminDashboard.jsx` | `admin` | KPIs institucionales, gestión CRUD de usuarios, modal de asignación y analítica |
| `/teacher` | `TeacherDashboard.jsx` | `teacher` | Lista de materias, inscripción de estudiantes, planilla de notas y gráficos |
| `/student` | `StudentDashboard.jsx` | `student` | Tarjeta de materias matriculadas, calificaciones periódicas y promedio final |
| `/chat` | `ChatPage.jsx` | Cualquier rol | Tutor matemático con IA, selector de modelo (Groq/Cerebras) y teclado científico |
| `/perfil` | `ProfilePage.jsx` | Cualquier rol | Consulta de datos de cuenta y cambio seguro de contraseña |
| `*` | Redirección segura | Autenticado | Atrapa rutas no definidas y redirige al dashboard correspondiente |

---

## 4. Capa de Servicios del Frontend (`src/services/`)

La nueva capa de servicios desacopla la interacción con Supabase de los componentes de la interfaz de usuario:

### 4.1. `adminService.js`
- `fetchPlatformStats()`: Retorna conteos globales de usuarios, profesores, estudiantes y cursos.
- `fetchUsersList(roleFilter)`: Invoca la Edge Function `/functions/v1/list-users`.
- `createUser(payload)`: Invoca `/functions/v1/create-user` para crear el perfil y auth.
- `updateUser(payload)`: Invoca `/functions/v1/update-user`.
- `deleteUser(userId)`: Invoca `/functions/v1/delete-user`.
- `assignCoursesToTeacher(teacherId, courseIds)`: Invoca `/functions/v1/admin-assign-courses-to-teacher`.
- `assignStudentsToTeacher(teacherId, studentIds)`: Invoca `/functions/v1/admin-assign-students-to-teacher`.

### 4.2. `courseService.js`
- `fetchCourses(filters)`: Consulta cursos filtrando por titularidad o grado escolar.
- `createCourse(courseData)`: Inserta un nuevo curso asociando el docente correspondiente.
- `deleteCourse(courseId)`: Invoca `/functions/v1/delete-course` con eliminación en cascada controlada.
- `fetchCourseEnrollments(courseId)`: Retorna alumnos matriculados mediante JOIN optimizado por índice.

### 4.3. `dashboardService.js`
- `fetchStudentDashboardData()`: Agrega cursos, calificaciones (P1, P2, P3) y calcula el promedio ponderado (PF).
- `fetchTeacherDashboardData()`: Consolida cursos del docente, lista de matriculados y estadísticas de rendimiento.

---

## 5. Endpoints de Backend (Supabase Edge Functions en Deno)

Todas las funciones serverless residen en `supabase/functions/` y se ejecutan bajo el runtime de Deno:

### 5.1. Gestión de Identidad y Cuentas
| Endpoint | Método | Acceso Requerido | Descripción Operativa |
| :--- | :---: | :---: | :--- |
| `/functions/v1/list-users` | `GET` | Bearer JWT (`admin`) | Lista usuarios con paginación y metadatos de perfil |
| `/functions/v1/create-user` | `POST` | Bearer JWT (`admin`, `teacher`) | Crea usuario en `auth.users` y sincroniza `public.profiles` |
| `/functions/v1/update-user` | `POST` | Bearer JWT (`admin`) | Actualiza nombre, correo o rol con Service Role |
| `/functions/v1/delete-user` | `POST` | Bearer JWT (`admin`) | Elimina al usuario en auth y limpia registros relacionados |

### 5.2. Asignaciones y Cursos
| Endpoint | Método | Acceso Requerido | Descripción Operativa |
| :--- | :---: | :---: | :--- |
| `/functions/v1/admin-assign-courses-to-teacher` | `POST` | Bearer JWT (`admin`) | Asigna masivamente un conjunto de cursos a un docente |
| `/functions/v1/admin-assign-students-to-teacher` | `POST` | Bearer JWT (`admin`) | Actualiza el campo `created_by` de los perfiles estudiantiles |
| `/functions/v1/delete-course` | `POST` | Bearer JWT (`admin`) | Elimina el curso y sus matrículas en una sola transacción |

### 5.3. Inteligencia Artificial y Tutoría
| Endpoint | Método | Acceso Requerido | Descripción Operativa |
| :--- | :---: | :---: | :--- |
| `/functions/v1/chat` | `GET` | Bearer JWT (Cualquier rol) | Recupera hilos activos (`chat_threads`) y mensajes (`chat_messages`) |
| `/functions/v1/chat` | `POST` | Bearer JWT (Cualquier rol) | Envía prompt contextual a Groq (`llama-3.1-8b-instant`) o Cerebras (`gpt-oss-120b`) |

---

## 6. Diagrama de Arquitectura Interactivo (Archify)

El sistema cuenta con un diagrama de arquitectura generado de forma determinista mediante **Archify**:
- **Especificación JSON:** [`docs/arquitectura-y-rutas.architecture.json`](file:///C:/Users/Oscar%20Padilla/Documents/GitHub/NexuMathEdu/docs/arquitectura-y-rutas.architecture.json)
- **Artefacto HTML Interactivo:** [`docs/arquitectura-y-rutas-interactivo.html`](file:///C:/Users/Oscar%20Padilla/Documents/GitHub/NexuMathEdu/docs/arquitectura-y-rutas-interactivo.html)
  - Modos de visualización: Modo Oscuro / Modo Claro.
  - Vistas Guiadas (*Guided Views*): Flujo Completo, Autenticación y RBAC, Tutor Inteligente.
  - Exportación en alta resolución (SVG, PNG, WebP).
