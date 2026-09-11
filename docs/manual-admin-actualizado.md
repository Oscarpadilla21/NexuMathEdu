# Manual de Usuario — Rol Administrador (NexuMathEdu)

## 1. Inicio de sesión y Seguridad

1. Ingresa a la URL principal de la plataforma educativa.
2. Introduce tu **correo electrónico institucional** y **contraseña**.
3. Haz clic en **Iniciar sesión**.
4. El sistema valida las credenciales contra Supabase Auth y consulta tu rol en la tabla `profiles`. Al detectar el rol `admin`, serás redirigido automáticamente al panel de administración (`/admin`).

> **Seguridad y Cierre de Sesión:**
> - El sistema cuenta con un monitor de actividad que cierra la sesión automáticamente tras **30 minutos de inactividad**.
> - Todas las vistas críticas están encapsuladas dentro de un componente `ErrorBoundary` para prevenir bloqueos de pantalla o caídas inesperadas de la interfaz ante fallos de red.

---

## 2. Panel Principal de Administración (`/admin`)

El panel de administración centraliza la gestión operativa y académica de la institución, comunicándose con la base de datos a través de la capa de servicios desacoplada (`src/services/adminService.js`) y Edge Functions seguras con permisos elevados.

### 2.1. Resumen de Métricas de Plataforma (KPIs)
- **Total de Usuarios:** Conteo global de cuentas registradas en el sistema.
- **Total de Profesores:** Cantidad de docentes activos con cursos o permisos asignados.
- **Total de Estudiantes:** Cantidad de alumnos registrados en el sistema.
- **Total de Cursos:** Volumen de cursos creados en todos los niveles académicos.

---

### 2.2. Gestión Centralizada de Usuarios

#### Crear Usuario
1. Haz clic en el botón superior **"Agregar usuario"**.
2. Completa los campos requeridos:
   - **Nombre completo**
   - **Correo electrónico**
   - **Contraseña temporal**
   - **Rol institucional:** Selecciona entre **Profesor** (`teacher`) o **Estudiante** (`student`).
   - *(Opcional para estudiantes)*: **Grado escolar** (6° a 11°).
3. Haz clic en **"Crear usuario"**. La solicitud es procesada por la Edge Function `/functions/v1/create-user`, la cual crea el usuario en `auth.users` y sincroniza su perfil en la tabla `public.profiles`.

#### Editar Usuario
1. Localiza al usuario en la tabla interactiva y haz clic en el ícono de edición (lápiz).
2. Puedes modificar: **Nombre completo**, **Correo electrónico** y **Rol**.
3. Confirma los cambios. La operación se procesa a través de la Edge Function `/functions/v1/update-user`.

> **Nota de Seguridad:** Por directrices de seguridad de la base de datos (RLS), las elevaciones al rol de `admin` se restringen para evitar escalamientos no autorizados.

#### Eliminar Usuario
1. Localiza al usuario en la lista.
2. Haz clic en el ícono de eliminación (papelera roja).
3. Confirma la acción en el diálogo de seguridad. La Edge Function `/functions/v1/delete-user` removerá el registro de autenticación, matrículas asociadas y perfil relacional.

---

### 2.3. Gestión de Cursos y Grados Académicos

#### Crear un Nuevo Curso
1. Haz clic en **"Agregar curso"**.
2. Diligencia los datos:
   - **Nombre del curso** (ej. *Álgebra Lineal 9°*, *Cálculo Diferencial 11°*).
   - **Grado escolar:** Selección entre 6° y 11°.
   - **Descripción pedagógica.**
   - **Profesor titular:** Puedes asociar inmediatamente a un docente o dejarlo pendiente.
3. Guarda el curso.

#### Editar y Eliminar Cursos
- **Editar:** Permite actualizar nombre, grado, descripción y profesor titular.
- **Eliminar:** Invoca la función `/functions/v1/delete-course`, removiendo el curso y limpiando las matrículas vinculadas para mantener la integridad referencial.

#### Gestión de Matrículas Directas
1. En la fila del curso deseado, haz clic en el ícono de **"Matrículas"** (ícono de usuarios).
2. Marca o desmarca estudiantes de la lista de alumnos disponibles.
3. Guarda los cambios para registrar las filas en la tabla `public.enrollments`.

---

### 2.4. Asignaciones Rápidas y Masivas (`TeacherAssignmentModal`)

Para facilitar la distribución de carga académica sin necesidad de editar curso por curso, el administrador dispone de modales de asignación rápida:

#### Asignar Cursos a un Docente
1. Haz clic en la acción rápida **"Asignar cursos a profesor"**.
2. Se desplegará el modal interactivo de asignación (`TeacherAssignmentModal`).
3. Selecciona el **docente destino** en el menú desplegable.
4. Selecciona mediante casillas de verificación los **cursos** que se transferirán a dicho profesor.
5. Haz clic en **"Guardar asignación"**. La operación invoca la Edge Function `/functions/v1/admin-assign-courses-to-teacher` garantizando atomicidad transaccional.

#### Asignar Estudiantes a un Docente
1. Haz clic en **"Asignar estudiantes a profesor"**.
2. Selecciona al profesor destino y marca la lista de estudiantes correspondientes.
3. La acción ejecuta `/functions/v1/admin-assign-students-to-teacher`, actualizando el campo `created_by` de los perfiles estudiantiles para que aparezcan en el panel de dicho profesor.

---

### 2.5. Analítica de Rendimiento Institucional (`CoursePerformanceSection`)
- Gráficos interactivos construidos con **ApexCharts** para auditar el desempeño académico global.
- Visualización de notas promedio por curso, tasas de aprobación y distribución de calificaciones (Período 1, 2, 3 y Nota Final).
- Filtros por grado y curso con optimización de renderizado para evitar recargas innecesarias.

---

## 3. Asistente Inteligente y Chat con IA (`/chat`)

El administrador cuenta con acceso al asistente inteligente configurado con un perfil de **Gestión Operativa y Soporte Académico**.

### 3.1. Arquitectura Multi-Proveedor de IA
En el panel de configuración del chat, el administrador puede alternar entre proveedores de inferencia de ultrabaja latencia:
1. **Profesor 1 (Predeterminado):** Impulsado por **Groq** ejecutando el modelo `llama-3.1-8b-instant`. Ideal para respuestas pedagógicas inmediatas y síntesis conceptual.
2. **Profesor 2:** Impulsado por **Cerebras** ejecutando el modelo de alta capacidad `gpt-oss-120b`. Ideal para razonamientos complejos, resolución simbólica profunda y planificación curricular exhaustiva.

### 3.2. Parámetros de Personalización y Bloqueo de Estado
- **Tono:** Claro, formal, conciso o motivador.
- **Nivel de detalle:** Breve, medio o exhaustivo.
- **Enfoque temático:** Matemáticas generales, álgebra, geometría, cálculo o estadística.
- **Persistencia y Bloqueo:** Al pulsar **"Guardar configuración"** o al enviar el primer mensaje en un hilo de chat, los ajustes quedan persistidos en la tabla `chat_threads` y bloqueados para asegurar coherencia en la conversación. Puedes usar **"Restablecer ajustes"** para volver a los valores iniciales.

### 3.3. Teclado Numérico Científico y Notación KaTeX
- Al pulsar el ícono de calculadora en la barra de entrada, se abre el **teclado científico interactivo**.
- Inserta operadores y funciones directamente en el cursor: potencias ($x^2$), raíces ($\sqrt{x}$), funciones trigonométricas ($\sin, \cos, \tan$), logaritmos ($\ln, \log$), constantes ($\pi, e$) y signos de agrupación.
- El chat interpreta automáticamente notación LaTeX y la renderiza de forma elegante mediante **KaTeX**.

---

## 4. Perfil de Usuario (`/perfil`) y Cierre de Sesión

- Consulta de metadatos de la cuenta activa (nombre completo, correo institucional, rol del sistema y proveedor de chat preferido).
- Módulo de **cambio de contraseña** directo con validación de seguridad de Supabase Auth.
- Botón de **Cerrar sesión** en la barra superior con limpieza inmediata de tokens y sesión local.
