# Manual de Usuario — Rol Administrador

## 1. Inicio de sesión

1. Ingresa a la URL de la aplicación.
2. Introduce tu **correo electrónico** y **contraseña**.
3. Haz clic en **Iniciar sesión**.
4. Serás redirigido automáticamente al panel de administración.

> Si olvidaste tu contraseña, contacta a otro administrador para restablecerla.

---

## 2. Panel principal (/admin)

Al iniciar sesión verás las siguientes secciones:

### 2.1. Resumen de estadísticas
- **Total de usuarios** registrados en la plataforma.
- **Total de profesores**.
- **Total de estudiantes**.
- **Total de cursos** creados.

### 2.2. Gestión de usuarios

#### Crear usuario
1. Haz clic en **"Agregar usuario"**.
2. Completa: nombre, correo electrónico, contraseña y rol (**Administrador**, **Profesor** o **Estudiante**).
3. Confirma la creación. El usuario recibirá un correo con sus credenciales (si está configurado).

#### Editar usuario
1. Busca al usuario en la tabla y haz clic en el ícono de edición (lápiz).
2. Puedes modificar: **nombre**, **correo** y **rol**.
3. Guarda los cambios.

> **Nota:** No puedes asignar el rol de administrador desde el panel. Si necesitas cambiar a alguien a administrador, hazlo desde la base de datos.

#### Eliminar usuario
1. Busca al usuario en la tabla.
2. Haz clic en el ícono de eliminación (basurero).
3. Confirma la acción. Esta operación no se puede deshacer.

### 2.3. Gestión de cursos

#### Crear curso
1. Haz clic en **"Agregar curso"**.
2. Completa: **nombre del curso**, **grado** (6° a 11°), **descripción** y **profesor asignado** (opcional).
3. Guarda el curso.

#### Editar curso
1. Busca el curso en la tabla y haz clic en editar.
2. Modifica los campos necesarios.
3. Guarda los cambios.

#### Eliminar curso
1. Busca el curso y haz clic en eliminar.
2. Confirma la acción. Se eliminarán también las matrículas asociadas.

#### Matricular estudiantes en un curso
1. Desde la tabla de cursos, haz clic en el ícono de "matrículas" (personas).
2. Selecciona los estudiantes a agregar o remover.
3. Guarda los cambios.

### 2.4. Asignaciones masivas

#### Asignar estudiantes a un profesor
1. Haz clic en **"Asignar estudiantes a profesor"**.
2. Selecciona el **profesor** destino.
3. Marca los **estudiantes** que deseas asignar.
4. Confirma la asignación.

#### Asignar cursos a un profesor
1. Haz clic en **"Asignar cursos a profesor"**.
2. Selecciona el **profesor** destino.
3. Marca los **cursos** que deseas transferir.
4. Confirma la asignación.

### 2.5. Rendimiento de cursos
- Visualiza gráficos y estadísticas de rendimiento de **todos los cursos** de la plataforma.
- Puedes filtrar por curso y ver promedios generales.

---

## 3. Chat con IA (/chat)

- Accede al chat con IA para obtener ayuda en la gestión de la plataforma.
- El asistente tiene contexto del sistema educativo y puede ayudarte con consultas administrativas.

### 3.1. Configuración del chat

- **Ajustes del chat**: Puedes personalizar el tono, nivel de detalle, enfoque, idioma y proveedor del chat.
- **Guardar configuración**: Una vez ajustados los parámetros, haz clic en **"Guardar configuración"** para persistir tu proveedor preferido. Al guardar, los ajustes se bloquean para evitar cambios accidentales.
- **Restablecer ajustes**: Vuelve a los valores predeterminados y desbloquea la configuración.
- Los ajustes se bloquean automáticamente una vez que el chat tiene mensajes o después de guardar la configuración.

### 3.2. Teclado matemático

- Al lado del campo de texto hay un botón con ícono de calculadora 🖩 que abre un **teclado numérico científico**.
- Incluye: números (0-9), operadores (+, -, ×, ÷), funciones trigonométricas (sin, cos, tan), logaritmos (log, ln), raíz cuadrada (√), potencias (x²), constantes (π, e), paréntesis y controles (← retroceso, C limpiar).
- Las teclas insertan el carácter en la posición del cursor dentro del campo de texto.

---

## 4. Perfil (/perfil)

- Visualiza tu información personal (nombre, correo, rol).
- Puedes **cambiar tu contraseña**.

---

## 5. Cierre de sesión

Haz clic en el botón **"Cerrar sesión"** en el encabezado. Después de 30 minutos de inactividad, tu sesión se cerrará automáticamente por seguridad.
