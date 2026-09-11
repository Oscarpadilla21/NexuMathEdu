/**
 * Script de Keep-Alive para Supabase
 * Realiza un ping a los endpoints de Auth y PostgREST para reiniciar el temporizador
 * de 7 días de inactividad del plan gratuito de Supabase.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://yowfcesdfdqvuoofgvhu.supabase.co';
const API_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_12EUxSKzUUmn3bcl3cD-kQ_AmGNuWNc';

async function pingEndpoint(name, url, headers) {
  try {
    const start = Date.now();
    const res = await fetch(url, { headers });
    const duration = Date.now() - start;
    console.log(`[${res.status} ${res.statusText}] ${name} (${duration}ms)`);
    return res.ok;
  } catch (err) {
    console.error(`[ERROR] ${name}:`, err.message);
    return false;
  }
}

async function main() {
  console.log(`=== Supabase Keep-Alive Ping ===`);
  console.log(`Destino: ${SUPABASE_URL}`);
  console.log(`Fecha: ${new Date().toISOString()}\n`);

  const authOk = await pingEndpoint(
    'Auth Health (/auth/v1/health)',
    `${SUPABASE_URL}/auth/v1/health`,
    { apikey: API_KEY }
  );

  const dbOk = await pingEndpoint(
    'PostgreSQL Query (/rest/v1/profiles?select=id&limit=1)',
    `${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`,
    {
      apikey: API_KEY,
      Authorization: `Bearer ${API_KEY}`,
    }
  );

  if (authOk && dbOk) {
    console.log(`\n✅ Exito: Supabase activo. El contador de 7 dias se ha reiniciado correctamente.`);
  } else {
    console.warn(`\n⚠️ Advertencia: Al menos una consulta no retorno 200 OK. Revisa los logs.`);
  }
}

main();
