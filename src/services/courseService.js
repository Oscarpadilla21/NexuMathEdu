import { supabase } from '../lib/supabase'
import { withTimeout } from '../utils/withTimeout'

/**
 * Servicio centralizado para cursos, inscripciones y calificaciones.
 */
export const courseService = {
  /**
   * Obtiene todos los cursos activos.
   */
  async getCourses() {
    const { data, error } = await withTimeout(
      supabase.from('courses').select('*').order('created_at', { ascending: false }),
      10000,
      'Error al cargar cursos'
    )
    if (error) throw error
    return data || []
  },

  /**
   * Guarda o actualiza un curso.
   */
  async upsertCourse(course) {
    const isEdit = Boolean(course.id)
    const query = isEdit
      ? supabase.from('courses').update(course).eq('id', course.id).select().single()
      : supabase.from('courses').insert(course).select().single()

    const { data, error } = await withTimeout(query, 10000, 'Error al guardar el curso')
    if (error) throw error
    return data
  },

  /**
   * Guarda o actualiza una calificación de curso.
   */
  async upsertGrade(gradeRecord) {
    const { data, error } = await withTimeout(
      supabase
        .from('course_grades')
        .upsert(gradeRecord, { onConflict: 'course_id,student_id' })
        .select()
        .single(),
      10000,
      'Error al registrar la calificación'
    )
    if (error) throw error
    return data
  },
}
