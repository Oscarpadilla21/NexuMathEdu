import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'jsr:@supabase/supabase-js@2/cors'
import {
  getChatProviderDefinitions,
  normalizeChatProvider,
} from './chatProviders.js'

type ChatSettings = {
  tone?: string
  detailLevel?: string
  focus?: string
  language?: string
  provider?: string
  topic?: string
  scaffolding?: string
}

type ChatRequestBody = {
  message?: string
  thread_id?: string
  settings?: ChatSettings
}

type NormalizedChatSettings = {
  tone: string
  detailLevel: string
  focus: string
  language: string
  provider: string
  topic: string
  scaffolding: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function safeTrim(value: unknown) {
  return String(value || '').trim()
}

const DEFAULT_CHAT_SETTINGS: NormalizedChatSettings = {
  tone: 'claro',
  detailLevel: 'medio',
  focus: 'matematicas',
  language: 'espanol',
  provider: 'profesor_1',
  topic: 'general',
  scaffolding: 'socratico',
}

function normalizeChatSettings(settings: ChatSettings = {}, fallbackProvider?: string): NormalizedChatSettings {
  return {
    tone: safeTrim(settings.tone) || DEFAULT_CHAT_SETTINGS.tone,
    detailLevel: safeTrim(settings.detailLevel) || DEFAULT_CHAT_SETTINGS.detailLevel,
    focus: safeTrim(settings.focus) || DEFAULT_CHAT_SETTINGS.focus,
    language: safeTrim(settings.language) || DEFAULT_CHAT_SETTINGS.language,
    provider: normalizeChatProvider(safeTrim(settings.provider) || fallbackProvider || DEFAULT_CHAT_SETTINGS.provider),
    topic: safeTrim(settings.topic) || DEFAULT_CHAT_SETTINGS.topic,
    scaffolding: safeTrim(settings.scaffolding) || DEFAULT_CHAT_SETTINGS.scaffolding,
  }
}

function buildSystemPrompt(role: string | null, settings: NormalizedChatSettings) {
  const tone = settings.tone
  const detailLevel = settings.detailLevel
  const focus = settings.focus
  const language = settings.language
  const topic = settings.topic || 'general'
  const scaffolding = settings.scaffolding || 'socratico'

  const roleGuidance = {
    admin: `Eres un asistente de soporte operativo y técnico para administradores de NexuMathEdu. 
            Tus respuestas deben ser precisas, breves y orientadas a la gestión de la plataforma y resolución de incidentes técnicos.`,
            
    teacher: `Eres un asesor pedagógico para profesores en NexuMathEdu. 
              Ayúdales a diseñar planes de clase, rúbricas de evaluación, estructurar problemas matemáticos dinámicos y sugerir actividades didácticas. 
              Mantén un enfoque profesional, didáctico y propositivo.`,
              
    student: `Eres un tutor experto en matemáticas y pedagogía para estudiantes en NexuMathEdu. 
              REGLA CLAVE DE NIVEL MICRO: Intervén activamente adaptando el nivel de ayuda y la retroalimentación al perfil del estudiante. No entregues la respuesta final directa sin andamiaje.`
  }

  const topicGuidance: Record<string, string> = {
    general: 'Enfoca tus explicaciones en matemáticas en general.',
    aritmetica: 'Enfoca tus explicaciones, ejercicios y problemas en Aritmética de secundaria (como fracciones, razones, proporciones, porcentajes y operaciones básicas).',
    algebra: 'Enfoca tus explicaciones, ejercicios y problemas en Álgebra de secundaria (como ecuaciones de primer y segundo grado, factorización, simplificación de expresiones algebraicas y sistemas de ecuaciones).',
    geometria: 'Enfoca tus explicaciones, ejercicios y problemas en Geometría de secundaria (como áreas, perímetros, volúmenes, Teorema de Pitágoras, congruencia y semejanza de figuras).',
    trigonometria: 'Enfoca tus explicaciones, ejercicios y problemas en Trigonometría de secundaria (como razones trigonométricas seno, coseno, tangente, resolución de triángulos rectángulos y oblicuángulos).',
    funciones: 'Enfoca tus explicaciones, ejercicios y problemas en Funciones y Gráficas de secundaria (como función lineal, función cuadrática, tabulación y la interpretación de gráficas cartesianas).',
    estadistica: 'Enfoca tus explicaciones, ejercicios y problemas en Probabilidad y Estadística de secundaria (como medidas de tendencia central media, mediana y moda, probabilidad simple, diagramas y análisis de tablas de frecuencia).'
  }

  const scaffoldingGuidance: Record<string, string> = {
    pista: 'NIVEL MICRO DE TUTORÍA ADAPTATIVA - MODO PISTA INICIAL: Proporciona únicamente una pista conceptual clave o analogía socrática. NO des la solución completa ni el resultado numérico.',
    socratico: 'NIVEL MICRO DE TUTORÍA ADAPTATIVA - MODO PREGUNTA SOCRÁTICA: Guía al alumno mediante 1 o 2 preguntas orientadoras sencillas para que él descubra el siguiente paso por sí mismo.',
    paso_a_paso: 'NIVEL MICRO DE TUTORÍA ADAPTATIVA - MODO DESGLOSE PASO A PASO: Desglosa el procedimiento en pasos claros y ordenados, pero deja el cálculo final para que el estudiante lo complete.',
    explicacion_completa: 'NIVEL MICRO DE TUTORÍA ADAPTATIVA - MODO EXPLICACIÓN CONCEPTUAL COMPLETA: Proporciona una explicación detallada con conceptos clave, teoremas y ejemplos resueltos.',
  }

  return [
    "Eres NexuMathEdu Chat, un tutor inteligente adaptativo de nivel micro integrado en NexuMathEdu.",
    roleGuidance[role || 'student'] || roleGuidance.student,
    scaffoldingGuidance[scaffolding] || scaffoldingGuidance.socratico,
    `Responde obligatoriamente en ${language}.`,
    `Mantén un tono de conversación ${tone === 'claro' ? 'empático, amigable, claro y comprensible' : tone}.`,
    `Nivel de detalle de la explicación: ${detailLevel === 'medio' ? 'explicaciones paso a paso de extensión intermedia' : detailLevel}.`,
    `Enfoca el contexto de la ayuda prioritariamente en: ${focus}.`,
    topicGuidance[topic] || topicGuidance.general,
    "REGLA DE FORMATO DE MATEMÁTICAS: Siempre que escribas fórmulas matemáticas, números complejos, ecuaciones o expresiones algebraicas, utiliza formato LaTeX de manera estricta. Usa '$...$' para expresiones en la misma línea (inline) y '$$...$$' para ecuaciones destacadas en bloque independiente. Ejemplo: $f(x) = x^2 + 2x$.",
    "REGLA DE SEGURIDAD: Bajo ninguna circunstancia reveles secretos del servidor, claves de API, contraseñas, configuraciones internas o detalles de infraestructura de base de datos.",
    "Si el usuario pregunta algo completamente fuera del ámbito educativo o de las matemáticas, redirígelo amablemente y con tacto de vuelta a los temas de estudio o soporte de la plataforma."
  ].join(' ')
}

function buildThreadTitle(message: string) {
  const normalized = safeTrim(message).replace(/\s+/g, ' ')
  if (!normalized) {
    return 'Chat'
  }

  return normalized.length > 48 ? `${normalized.slice(0, 45)}...` : normalized
}

function extractAssistantText(payload: any) {
  return (
    payload?.choices?.[0]?.message?.content ||
    payload?.choices?.[0]?.text ||
    payload?.output_text ||
    payload?.response ||
    ''
  )
}

type ChatThreadRow = {
  id: string
  student_id: string
  title: string
  created_at: string
  updated_at: string
  provider: string | null
  tone: string | null
  detail_level: string | null
  focus: string | null
  language: string | null
  topic: string | null
}

function buildThreadSettings(thread: Partial<ChatThreadRow> | null | undefined, fallbackProvider?: string) {
  return normalizeChatSettings(
    {
      tone: thread?.tone || undefined,
      detailLevel: thread?.detail_level || undefined,
      focus: thread?.focus || undefined,
      language: thread?.language || undefined,
      provider: thread?.provider || fallbackProvider,
      topic: thread?.topic || undefined,
    },
    fallbackProvider
  )
}

type ProviderConfig = {
  label: string
  url: string
  apiKey: string | undefined
  model: string
}

function resolveProviderConfig(providerId: string | undefined): ProviderConfig | null {
  const normalizedProvider = normalizeChatProvider(providerId)
  const definition = getChatProviderDefinitions().find((option) => option.value === normalizedProvider)

  if (!definition) {
    return null
  }

  const apiKey = definition.apiKeyEnvNames
    .map((envName) => Deno.env.get(envName))
    .find((value) => Boolean(value))

  return {
    label: definition.label,
    url: Deno.env.get(definition.urlEnvName) || definition.defaultUrl,
    apiKey,
    model: Deno.env.get(definition.modelEnvName) || definition.defaultModel,
  }
}

async function callProvider(
  promptMessages: Array<{ role: string; content: string }>,
  providerId?: string
) {
  const provider = resolveProviderConfig(providerId)
  const providerUrl = provider?.url
  const apiKey = provider?.apiKey

  // Si no hay proveedor configurado, devolvemos un mensaje util en vez de fallar duro.
  if (!providerUrl || !apiKey) {
    return 'No encontre una clave configurada. El chat ya guardo tu mensaje, pero falta definir el proveedor seleccionado en los secretos de Supabase.'
  }

  const model = provider.model

  const response = await fetch(providerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: promptMessages,
      temperature: 0.4,
      max_tokens: 700,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Chat provider error (${response.status}): ${errorText}`)
  }

  const payload = await response.json()
  const assistantText = safeTrim(extractAssistantText(payload))

  if (!assistantText) {
    throw new Error('Chat provider returned an empty response')
  }

  return assistantText
}

type VisibleChatUser = {
  id: string
  full_name: string | null
  email: string | null
  role: string
}

async function getVisibleChatUsers(
  adminClient: ReturnType<typeof createClient>,
  viewerId: string,
  viewerRole: string
): Promise<VisibleChatUser[]> {
  if (viewerRole === 'admin') {
    const { data, error } = await adminClient
      .from('profiles')
      .select('id, full_name, email, role')
      .neq('id', viewerId)
      .order('full_name', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  }

  if (viewerRole !== 'teacher') {
    return []
  }

  const studentMap = new Map<string, VisibleChatUser>()

  const { data: createdStudents, error: createdStudentsError } = await adminClient
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('role', 'student')
    .eq('created_by', viewerId)
    .order('full_name', { ascending: true })

  if (createdStudentsError) {
    throw new Error(createdStudentsError.message)
  }

  ;(createdStudents || []).forEach((student) => {
    studentMap.set(student.id, student)
  })

  const { data: courses, error: coursesError } = await adminClient
    .from('courses')
    .select('id')
    .eq('teacher_id', viewerId)

  if (coursesError) {
    throw new Error(coursesError.message)
  }

  const courseIds = (courses || []).map((course) => course.id)
  if (courseIds.length > 0) {
    const { data: enrollments, error: enrollmentsError } = await adminClient
      .from('enrollments')
      .select('student_id')
      .in('course_id', courseIds)

    if (enrollmentsError) {
      throw new Error(enrollmentsError.message)
    }

    const enrolledIds = [...new Set((enrollments || []).map((entry) => entry.student_id).filter(Boolean))]

    if (enrolledIds.length > 0) {
      const { data: enrolledStudents, error: enrolledStudentsError } = await adminClient
        .from('profiles')
        .select('id, full_name, email, role')
        .in('id', enrolledIds)
        .eq('role', 'student')
        .order('full_name', { ascending: true })

      if (enrolledStudentsError) {
        throw new Error(enrolledStudentsError.message)
      }

      ;(enrolledStudents || []).forEach((student) => {
        studentMap.set(student.id, student)
      })
    }
  }

  return Array.from(studentMap.values()).sort((left, right) =>
    (left.full_name || left.email || '').localeCompare(right.full_name || right.email || '', 'es')
  )
}

async function canViewUserChat(
  adminClient: ReturnType<typeof createClient>,
  viewerId: string,
  viewerRole: string,
  targetUserId: string
) {
  if (viewerId === targetUserId) {
    return true
  }

  const visibleUsers = await getVisibleChatUsers(adminClient, viewerId, viewerRole)
  return visibleUsers.some((user) => user.id === targetUserId)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  // La funcion depende de tres secretos del servidor: URL, anon key y service role.
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Missing Supabase secrets' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401)
  }

  // Cliente con permisos del usuario actual para validar la sesion.
  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  })

  const { data: userData, error: userError } = await callerClient.auth.getUser()
  if (userError || !userData?.user) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const { data: profileData } = await callerClient
    .from('profiles')
    .select('role, full_name, email, chat_provider')
    .eq('id', userData.user.id)
    .maybeSingle()

  const fallbackRole = userData.user.user_metadata?.role || userData.user.app_metadata?.role || 'student'
  const role = profileData?.role || fallbackRole || 'student'
  const profileDefaultProvider = normalizeChatProvider(
    profileData?.chat_provider || userData.user.user_metadata?.chat_provider || DEFAULT_CHAT_SETTINGS.provider
  )

  // Cliente privilegiado para leer y escribir historial de chat en nombre del servidor.
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const threadId = url.searchParams.get('thread_id')
    const requestedUserId = safeTrim(url.searchParams.get('user_id'))
    const isAdmin = role === 'admin'
    const isTeacher = role === 'teacher'
    let threadsOwnerId = userData.user.id

    if (requestedUserId && requestedUserId !== userData.user.id) {
      const allowed = await canViewUserChat(adminClient, userData.user.id, role, requestedUserId)
      if (!allowed) {
        return json({ error: 'Forbidden' }, 403)
      }
      threadsOwnerId = requestedUserId
    }

    // Listamos los hilos del usuario objetivo ordenados por actividad reciente.
    const threadsQuery = adminClient
      .from('chat_threads')
      .select('id, student_id, title, created_at, updated_at, provider, tone, detail_level, focus, language, topic')
      .eq('student_id', threadsOwnerId)
      .order('updated_at', { ascending: false })

    const { data: threads, error: threadsError } = await threadsQuery
    if (threadsError) {
      return json({ error: threadsError.message }, 500)
    }

    let activeThread: ChatThreadRow | null = null
    let activeThreadId = threadId || threads?.[0]?.id || null
    let messages: any[] = []

    if (threadId) {
      const { data: requestedThread, error: requestedThreadError } = await adminClient
        .from('chat_threads')
        .select('id, student_id, title, created_at, updated_at, provider, tone, detail_level, focus, language, topic')
        .eq('id', threadId)
        .maybeSingle()

      if (requestedThreadError) {
        return json({ error: requestedThreadError.message }, 500)
      }

      if (!requestedThread || requestedThread.student_id !== threadsOwnerId) {
        return json({ error: 'Thread not found' }, 404)
      }

      activeThread = requestedThread as ChatThreadRow
      activeThreadId = requestedThread.id
    } else if (activeThreadId) {
      const { data: latestThread, error: latestThreadError } = await adminClient
        .from('chat_threads')
        .select('id, student_id, title, created_at, updated_at, provider, tone, detail_level, focus, language, topic')
        .eq('id', activeThreadId)
        .maybeSingle()

      if (latestThreadError) {
        return json({ error: latestThreadError.message }, 500)
      }

      activeThread = latestThread as ChatThreadRow | null
    }

    if (activeThreadId) {
      // Si hay hilo activo, cargamos sus mensajes en orden cronologico.
      const { data: messageRows, error: messagesError } = await adminClient
        .from('chat_messages')
        .select('id, thread_id, sender_role, content, created_at')
        .eq('thread_id', activeThreadId)
        .order('created_at', { ascending: true })

      if (messagesError) {
        return json({ error: messagesError.message }, 500)
      }

      messages = messageRows || []
    }

    let visible_users: VisibleChatUser[] = []
    if (isAdmin || isTeacher) {
      try {
        visible_users = await getVisibleChatUsers(adminClient, userData.user.id, role)
      } catch (error) {
        return json(
          { error: error instanceof Error ? error.message : 'No se pudo cargar usuarios visibles' },
          500
        )
      }
    }

    return json({
      threads: threads || [],
      active_thread_id: activeThreadId,
      active_thread_settings: activeThread ? buildThreadSettings(activeThread, profileDefaultProvider) : normalizeChatSettings({}, profileDefaultProvider),
      messages,
      visible_users,
      user: {
        id: userData.user.id,
        email: profileData?.email || userData.user.email,
        full_name: profileData?.full_name || userData.user.user_metadata?.full_name || userData.user.email,
        role,
      },
    })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  let body: ChatRequestBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const userMessage = safeTrim(body?.message)
  if (!userMessage) {
    return json({ error: 'Message is required' }, 400)
  }

  const requestedSettings = normalizeChatSettings(body?.settings || {}, profileDefaultProvider)
  const requestedThreadId = safeTrim(body?.thread_id)

  let threadId = requestedThreadId || null
  let threadTitle = 'Chat'
  let threadSettings = requestedSettings

  if (threadId) {
    const { data: existingThread, error: threadError } = await adminClient
      .from('chat_threads')
      .select('id, title, student_id, provider, tone, detail_level, focus, language, topic')
      .eq('id', threadId)
      .maybeSingle()

    if (threadError) {
      return json({ error: threadError.message }, 500)
    }

    if (!existingThread || (existingThread.student_id !== userData.user.id && role !== 'admin')) {
      return json({ error: 'Thread not found' }, 404)
    }

    threadTitle = existingThread.title || 'Chat'
    if (body?.settings) {
      const { error: updateThreadError } = await adminClient
        .from('chat_threads')
        .update({
          provider: requestedSettings.provider,
          tone: requestedSettings.tone,
          detail_level: requestedSettings.detailLevel,
          focus: requestedSettings.focus,
          language: requestedSettings.language,
          topic: requestedSettings.topic,
        })
        .eq('id', threadId)

      if (!updateThreadError) {
        threadSettings = requestedSettings
      } else {
        threadSettings = buildThreadSettings(existingThread as ChatThreadRow, profileDefaultProvider)
      }
    } else {
      threadSettings = buildThreadSettings(existingThread as ChatThreadRow, profileDefaultProvider)
    }
  } else {
    // Si no existe hilo previo, creamos uno nuevo con un titulo resumido.
    threadTitle = buildThreadTitle(userMessage)
    const { data: createdThread, error: createThreadError } = await adminClient
      .from('chat_threads')
      .insert({
        student_id: userData.user.id,
        title: threadTitle,
        provider: requestedSettings.provider,
        tone: requestedSettings.tone,
        detail_level: requestedSettings.detailLevel,
        focus: requestedSettings.focus,
        language: requestedSettings.language,
        topic: requestedSettings.topic,
      })
      .select('id, title, student_id, provider, tone, detail_level, focus, language, topic')
      .single()

    if (createThreadError) {
      return json({ error: createThreadError.message }, 500)
    }

    threadId = createdThread.id
    threadTitle = createdThread.title || threadTitle
    threadSettings = buildThreadSettings(createdThread as ChatThreadRow, profileDefaultProvider)
  }

  // Guardamos primero el mensaje del usuario antes de consultar el servicio externo.
  const { error: insertUserMessageError } = await adminClient.from('chat_messages').insert({
    thread_id: threadId,
    sender_role: role,
    content: userMessage,
  })

  if (insertUserMessageError) {
    return json({ error: insertUserMessageError.message }, 500)
  }

  // Recuperamos el hilo completo para construir el contexto de la respuesta.
  const { data: recentMessages, error: recentMessagesError } = await adminClient
    .from('chat_messages')
    .select('sender_role, content, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (recentMessagesError) {
    return json({ error: recentMessagesError.message }, 500)
  }

  const systemPrompt = buildSystemPrompt(role, threadSettings)
  const promptMessages = [
    { role: 'system', content: systemPrompt },
    ...(recentMessages || []).map((entry) => ({
      role: entry.sender_role === 'assistant' ? 'assistant' : 'user',
      content: entry.content,
    })),
  ]

  let assistantText = ''
  try {
    // Mandamos el contexto al proveedor y recuperamos la respuesta.
    assistantText = await callProvider(promptMessages, threadSettings.provider)
  } catch (error) {
    assistantText = `No pude conectar el servicio de chat en este momento. Tu mensaje ya quedo guardado. Detalle tecnico: ${error instanceof Error ? error.message : 'error desconocido'}`
  }

  const { error: insertAssistantError } = await adminClient.from('chat_messages').insert({
    thread_id: threadId,
    sender_role: 'assistant',
    content: assistantText,
  })

  if (insertAssistantError) {
    return json({ error: insertAssistantError.message }, 500)
  }

  // Actualizamos el titulo del hilo para que refleje el contenido mas reciente.
  await adminClient.from('chat_threads').update({ title: threadTitle }).eq('id', threadId)

  const { data: threads, error: threadsError } = await adminClient
    .from('chat_threads')
    .select('id, student_id, title, created_at, updated_at, provider, tone, detail_level, focus, language, topic')
    .eq('student_id', userData.user.id)
    .order('updated_at', { ascending: false })

  if (threadsError) {
    return json({ error: threadsError.message }, 500)
  }

  const { data: messages, error: messagesError } = await adminClient
    .from('chat_messages')
    .select('id, thread_id, sender_role, content, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (messagesError) {
    return json({ error: messagesError.message }, 500)
  }

  return json({
    thread_id: threadId,
    assistant_message: assistantText,
    threads: threads || [],
    messages: messages || [],
    active_thread_settings: threadSettings,
  })
})
