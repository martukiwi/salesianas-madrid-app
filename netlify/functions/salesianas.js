exports.handler = async function(event) {
  const upstream = "https://juegosdeportivos.ecmadrid.org/api/JornadaEnfrentamientosPorGrupo";
  const params = new URLSearchParams({
    action: "ObtenerEnfrentamientosGrupoListado",
    skip: "0", take: "100",
    sort: JSON.stringify([{selector:"FechaHora",desc:false}]),
    IdDeporte:"2", IdCompeticion:"112", IdCategoria:"303",
    IdGrupo:"175", IdJornada:"0", IdEquipo:"0"
  });
  try {
    const response = await fetch(upstream + "?" + params.toString(), {
      headers: {
        "Accept":"application/json, text/javascript, */*; q=0.01",
        "X-Requested-With":"XMLHttpRequest",
        "Referer":"https://juegosdeportivos.ecmadrid.org/Calendarios/CalendarioTemporada",
        "Cookie":"ECMSeleccionConsulta=t=12&vc=0&d=2&co=112&ca=303&g=175"
      }
    });
    const body = await response.text();
    return {
      statusCode: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store"
      },
      body
    };
  } catch(e) {
    return {
      statusCode: 502,
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({error:"No se pudo consultar ECM",detail:String(e)})
    };
  }
};
