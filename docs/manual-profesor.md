# Manual de Usuario — Rol Profesor (NexuMathEdu)

## 1. Inicio de sesión y Acceso Seguro

1. Ingresa a la URL principal de la aplicación educativa.
2. Introduce tu **correo electrónico docente** y **contraseña**.
3. Haz clic en **Iniciar sesión**.
4. Supabase Auth valida la identidad y recupera tu perfil. Al confirmar el rol `teacher`, la plataforma te redirige de manera segura a tu panel principal (`/teacher`).

> **Seguridad de la Sesión:**
> - Tu sesión se cerrará de forma automática tras **30 minutos de inactividad** para salvaguardar las calificaciones y datos sensibles de los estudiantes.
> - La interfaz está protegida por un límite de fallos (`ErrorBoundary`) que garantiza la estabilidad del sistema ante problemas transitorios de conexión.

---

## 2. Panel Principal del Docente (`/teacher`)

El panel del profesor está optimizado para la gestión pedagógica ágil. Las consultas a la base de datos se ejecutan con filtros directos de propiedad (`teacher_id = auth.uid()`) que aprovechan los nuevos índices B-Tree de PostgreSQL para máxima velocidad de respuesta.

### 2.1. Métricas de Rendimiento Académico (KPIs)
- **Total de Cursos Asignados:** Conteo de cursos bajo tu titularidad.
- **Estudiantes Matriculados:** Total de alumnos inscritos en el conjunto de tus cursos.
- **Promedio General:** Media aritmética de las notas finales (PF) de todos tus estudiantes, calculada en tiempo real.

---

### 2.2. Administración de Cursos

#### Crear un Curso
1. Haz clic en **"Agregar curso"**.
2. Ingresa los datos:
   - **Nombre de la materia:** (Ejemplo: *Geometría Euclidiana 8°*, *Trigonometría 10°*).
   - **Grado escolar:** Selección entre 6° y 11°.
   - **Descripción pedagógica:** Objetivos de aprendizaje y metodología.
3. Guarda el curso. El sistema asigna automáticamente tu ID de profesor (`teacher_id`) en la tabla `public.courses`.

#### Editar y Gestionar Cursos
- **Editar:** Permite actualizar el nombre, grado o descripción del curso en cualquier momento.
- **Eliminar:** Puedes eliminar cursos de tu autoría que no contengan registros protegidos de auditoría institucional.

---

### 2.3. Gestión de Estudiantes y Matrículas

#### Registrar un Nuevo Estudiante
1. Haz clic en el botón **"Agregar estudiante"**.
2. Ingresa el **nombre completo**, **correo electrónico** y una **contraseña temporal**.
3. El sistema registra al alumno vinculando tu ID en el campo `created_by` del perfil, asegurando que el estudiante sea inmediatamente visible y gestionable en tu panel sin intermediación administrativa.

#### Matricular y Desmatricular Alumnos
1. En la tarjeta o fila del curso deseado, haz clic en el botón de **"Matrículas"** (ícono de usuarios).
2. Se desplegará la lista de estudiantes disponibles.
3. Marca o desmarca las casillas correspondientes para añadir o retirar alumnos del curso.
4. Al guardar, se sincronizan los registros en `public.enrollments`.

---

### 2.4. Módulo de Calificaciones y Planilla de Notas

El módulo de notas permite una evaluación continua y transparente:

1. En la fila del curso, pulsa el ícono de **"Calificaciones"** (planilla de notas).
2. Se abrirá la planilla interactiva con la lista de estudiantes matriculados:
   - **P1 (Período 1):** Calificación del primer período.
   - **P2 (Período 2):** Calificación del segundo período.
   - **P3 (Período 3):** Calificación del tercer período.
   - **PF (Promedio Final):** Se calcula y actualiza automáticamente según la fórmula institucional:
     $$\text{PF} = \frac{\text{P1} + \text{P2} + \text{P3}}{3}$$
3. Haz clic en **"Guardar calificaciones"** para persistir los cambios en la tabla `public.course_grades`.

---

### 2.5. Analítica Visual de Rendimiento (`CoursePerformanceSection`)

El docente cuenta con un módulo de analítica gráfica impulsado por **ApexCharts**:
- **Gráficos de Distribución:** Visualiza qué porcentaje de alumnos se encuentra en rangos de desempeño: *Bajo*, *Básico*, *Alto* o *Superior*.
- **Comparativa de Períodos:** Permite observar la evolución del grupo entre el Período 1, Período 2 y Período 3.
- **Identificación Temprana:** Detecta de un vistazo estudiantes en riesgo de reprobación para diseñar estrategias de refuerzo a tiempo.

---

## 3. Asistente Pedagógico con Inteligencia Artificial (`/chat`)

Al acceder a `/chat`, el asistente adopta el perfil especializado de **Apoyo Educativo para Profesores**, configurado para asistir en:
- Diseño de guías pedagógicas y rúbricas de evaluación.
- Generación de bancos de preguntas y problemas matemáticos contextualizados.
- Estrategias didácticas para temas complejos (fracciones, ecuaciones diferenciales, identidades trigonométricas).

### 3.1. Selección de Modelo y Parámetros
En el menú de ajustes del chat puedes seleccionar el motor de inferencia:
- **Profesor 1:** Motor ultrarrápido con **Groq** (`llama-3.1-8b-instant`), óptimo para consultas inmediatas, redacción de ejemplos y ejercicios cortos.
- **Profesor 2:** Motor de alta potencia con **Cerebras** (`gpt-oss-120b`), óptimo para demostraciones formales, diseño de unidades curriculares completas y análisis de casos didácticos.

### 3.2. Teclado Numérico Científico y Fórmulas KaTeX
- Haz clic en el botón de calculadora en el campo de texto para desplegar el **teclado científico en pantalla**.
- Contiene accesos directos para símbolos y funciones matemáticas: $\sin, \cos, \tan, \log, \ln, \sqrt{\phantom{x}}, x^2, \pi, e$.
- El asistente responde usando notación $\LaTeX$ estándar, renderizada con tipografía matemática nítida gracias a la biblioteca **KaTeX**.

---

## 4. Perfil (`/perfil`) y Cierre de Sesión

- Consulta de datos personales y rol del usuario.
- Actualización de contraseña personal en cualquier momento.
- Botón de cierre de sesión seguro en el encabezado de navegación.
