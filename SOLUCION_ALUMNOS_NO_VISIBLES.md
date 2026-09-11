# Solución: Alumnos no se muestran en el panel del profesor

## Problema
Los alumnos recién creados no aparecen en la sección "Alumnos guardados" del panel del profesor.

## Causa raíz
La función `teacher-dashboard-data` estaba obteniendo TODOS los alumnos del sistema, sin filtrar por profesor. Esto significaba que:
- Un profesor veía alumnos creados por otros profesores
- No había forma de saber quién creó cada alumno

## Solución implementada

### 1. **Nuevo campo en tabla `profiles`**
Se agregó un campo `created_by` que almacena el ID del profesor que creó al alumno.

### 2. **Actualización en función `create-user`**
Cuando se crea un alumno, ahora se guarda automáticamente quién lo creó.

### 3. **Actualización en función `teacher-dashboard-data`**
Ahora solo los profesores ven:
- Sus propios alumnos (creados por ellos)
- Los admins siguen viendo todos los alumnos

## Pasos para aplicar los cambios

### Paso 1: Ejecutar la migración en Supabase
1. Abre tu proyecto de Supabase
2. Ve a **SQL Editor**
3. Copia y pega el contenido de `supabase/migrations/add_created_by_to_profiles.sql`
4. Ejecuta la migración

```sql
-- Add created_by column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_created_by_idx ON public.profiles(created_by);
```

### Paso 2: Verificar que todo está sincronizado
Después de ejecutar la migración:
1. Recarga la aplicación
2. Intenta crear un nuevo alumno
3. El alumno debe aparecer en "Alumnos guardados"

## Archivos modificados
- `supabase/schema.sql` - Agregado campo `created_by` a tabla profiles
- `supabase/functions/create-user/index.ts` - Ahora almacena `created_by` al crear alumnos
- `supabase/functions/teacher-dashboard-data/index.ts` - Ahora filtra por `created_by` para profesores
- `supabase/migrations/add_created_by_to_profiles.sql` - Migración para base de datos existente

## Resultado esperado
Después de aplicar los cambios:
✅ Los profesores ven solo sus propios alumnos creados
✅ Los alumnos nuevos aparecen inmediatamente en "Alumnos guardados"
✅ Los admins continúan viendo todos los alumnos del sistema
