import { supabase } from '../lib/supabase'
import { withTimeout } from '../utils/withTimeout'

/**
 * Servicio centralizado para operaciones del Administrador.
 */
export const adminService = {
  /**
   * Obtiene la lista completa de usuarios del sistema vía Edge Function.
   */
  async listUsers(page = 1, perPage = 100) {
    const { data, error } = await supabase.functions.invoke('list-users', {
      body: { page, per_page: perPage },
    })
    if (error) throw error
    return data
  },

  /**
   * Asigna estudiantes a un profesor específico.
   */
  async assignStudentsToTeacher(teacherId, studentIds) {
    const { data, error } = await supabase.functions.invoke('admin-assign-students-to-teacher', {
      body: {
        teacher_id: teacherId,
        student_ids: studentIds,
      },
    })
    if (error) throw error
    return data
  },

  /**
   * Asigna cursos a un profesor específico.
   */
  async assignCoursesToTeacher(teacherId, courseIds) {
    const { data, error } = await supabase.functions.invoke('admin-assign-courses-to-teacher', {
      body: {
        teacher_id: teacherId,
        course_ids: courseIds,
      },
    })
    if (error) throw error
    return data
  },

  /**
   * Crea un nuevo usuario mediante la Edge Function create-user.
   */
  async createUser(payload) {
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: payload,
    })
    if (error) throw error
    return data
  },

  /**
   * Actualiza el perfil y rol de un usuario existente.
   */
  async updateUser(payload) {
    const { data, error } = await supabase.functions.invoke('update-user', {
      body: payload,
    })
    if (error) throw error
    return data
  },

  /**
   * Elimina un usuario del sistema (perfil y autenticación).
   */
  async deleteUser(userId) {
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { user_id: userId },
    })
    if (error) throw error
    return data
  },

  /**
   * Elimina un curso y sus dependencias.
   */
  async deleteCourse(courseId) {
    const { data, error } = await supabase.functions.invoke('delete-course', {
      body: { course_id: courseId },
    })
    if (error) throw error
    return data
  },

  /**
   * Carga combinada de datos para el panel de administración.
   */
  async loadAdminData() {
    const [coursesRes, gradesRes, enrollmentsRes] = await Promise.all([
      withTimeout(
        supabase.from('courses').select('*').order('created_at', { ascending: false }),
        10000,
        'La consulta de cursos tardó demasiado'
      ),
      withTimeout(
        supabase.from('course_grades').select('*').order('updated_at', { ascending: false }),
        10000,
        'La consulta de calificaciones tardó demasiado'
      ),
      withTimeout(
        supabase.from('enrollments').select('*').order('enrolled_at', { ascending: false }),
        10000,
        'La consulta de inscripciones tardó demasiado'
      ),
    ])

    return {
      courses: coursesRes.data || [],
      courseGrades: gradesRes.data || [],
      enrollments: enrollmentsRes.data || [],
    }
  },
}
