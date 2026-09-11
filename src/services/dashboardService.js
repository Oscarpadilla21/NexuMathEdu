import { supabase } from '../lib/supabase'
import { withTimeout } from '../utils/withTimeout'

/**
 * Servicio centralizado para datos de paneles de control (Dashboards).
 */
export const dashboardService = {
  /**
   * Obtiene la información agregada para el panel del docente.
   */
  async getTeacherDashboardData(accessToken) {
    if (!accessToken) throw new Error('Se requiere token de autenticación')

    const { data, error } = await withTimeout(
      supabase.functions.invoke('teacher-dashboard-data', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
      10000,
      'La consulta del panel docente tardó demasiado.'
    )

    if (error) throw error
    return {
      courses: data?.courses || [],
      students: data?.students || [],
      enrollments: data?.enrollments || [],
    }
  },

  /**
   * Obtiene la información académica para el panel del estudiante.
   */
  async getStudentDashboardData(accessToken) {
    if (!accessToken) throw new Error('Se requiere token de autenticación')

    const { data, error } = await withTimeout(
      supabase.functions.invoke('student-dashboard-data', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
      10000,
      'La consulta del tablero de estudiante tardó demasiado.'
    )

    if (error) throw error
    return {
      courses: data?.courses || [],
      enrollments: data?.enrollments || [],
    }
  },
}
