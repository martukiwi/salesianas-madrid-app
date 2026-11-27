export default async function handler(request) {
  const headers = { 'Cache-Control': 'no-store' };
  const reply = (body, status = 200, extraHeaders = {}) =>
    Response.json(body, { status, headers: { ...headers, ...extraHeaders } });

  if (request.method !== 'GET') {
    return reply({ error: 'Método no permitido.' }, 405, { Allow: 'GET' });
  }

  const origin = 'https://juegosdeportivos.ecmadrid.org';
  const upstream = new URL('/api/JornadaEnfrentamientosPorGrupo', origin);
  upstream.search = new URLSearchParams({
    action: 'ObtenerEnfrentamientosGrupoListado',
    skip: '0', take: '100', IdDeporte: '2', IdCompeticion: '112',
    IdCategoria: '303', IdGrupo: '175', IdJornada: '0', IdEquipo: '0'
  });
  const signal = AbortSignal.timeout(10000);
  const team = 'SAGRADO CORAZÓN DE JESÚS SALESIANAS';
  const name = value => typeof value === 'string'
    ? value.normalize('NFC').trim().replace(/\s+/g, ' ').toUpperCase()
    : '';

  try {
    const data = [];
    let skip = 0;

    while (true) {
      upstream.searchParams.set('skip', String(skip));
      const response = await fetch(upstream, {
        headers: {
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest',
          Referer: `${origin}/Calendarios/CalendarioTemporada`,
          Cookie: 'ECMSeleccionConsulta=t=12&vc=0&d=2&co=112&ca=303&g=175'
        },
        redirect: 'error',
        signal
      });
      if (!response.ok) {
        console.error('ECM: respuesta HTTP', response.status);
        return reply({ error: 'ECM no pudo servir el calendario.' }, 502);
      }

      const payload = await response.json();
      const page = Array.isArray(payload) ? payload : payload?.data;
      if (!Array.isArray(page) || page.some(match => !match ||
        (!name(match.EquipoLocal) && !name(match.EquipoVisitante)))) {
        console.error('ECM: formato inesperado del listado');
        return reply({ error: 'ECM no devolvió un listado de encuentros válido.' }, 502);
      }

      for (const match of page) {
        if (name(match.EquipoLocal) !== team && name(match.EquipoVisitante) !== team) continue;
        const {
          EquipoLocal, EquipoVisitante, FechaHora, NumeroJornada, Campo, CampoJuego,
          ResultadoEquipoLocal, ResultadoEquipoVisitante, Cerrado
        } = match;
        data.push({
          EquipoLocal, EquipoVisitante, FechaHora, NumeroJornada, Campo,
          CampoJuego: CampoJuego && {
            Nombre: CampoJuego.Nombre, Direccion: CampoJuego.Direccion, Municipio: CampoJuego.Municipio
          },
          ResultadoEquipoLocal, ResultadoEquipoVisitante, Cerrado
        });
      }

      skip += page.length;
      const total = Number(payload?.totalCount ?? -1);
      if (Number.isSafeInteger(total) && total >= 0 ? skip >= total : page.length < 100) break;
      if (!page.length || skip >= 1000) {
        console.error('ECM: listado incompleto');
        return reply({ error: 'ECM no devolvió el calendario completo.' }, 502);
      }
    }

    return reply({ data, updatedAt: new Date().toISOString() });
  } catch (error) {
    if (signal.aborted || error.name === 'TimeoutError') {
      console.error('ECM: tiempo de espera agotado');
      return reply({ error: 'ECM tardó demasiado en responder.' }, 504);
    }
    if (error instanceof SyntaxError) {
      console.error('ECM: respuesta vacía o JSON no válido');
      return reply({ error: 'ECM devolvió una respuesta vacía o no válida.' }, 502);
    }
    console.error('ECM: no se pudo consultar el calendario', error.cause?.code ?? error.name);
    return reply({ error: 'No se pudo conectar con el calendario de ECM.' }, 502);
  }
}
