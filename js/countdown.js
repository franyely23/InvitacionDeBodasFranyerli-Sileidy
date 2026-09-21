/* Cuenta regresiva: utiliza la fecha y hora que la invitación ya muestra en #detailDate y #detailTime. */
(function () {
  "use strict";

  const daysEl = document.getElementById("countDays");
  const hoursEl = document.getElementById("countHours");
  const minutesEl = document.getElementById("countMinutes");
  const secondsEl = document.getElementById("countSeconds");
  const dateEl = document.getElementById("detailDate");
  const timeEl = document.getElementById("detailTime");

  if (!daysEl || !hoursEl || !minutesEl || !secondsEl || !dateEl || !timeEl) return;

  const meses = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
  };

  function convertirFecha(textoFecha, textoHora) {
    const fecha = textoFecha.trim().toLowerCase()
      .replace(/^(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)[,\s]+/, "");
    const m = fecha.match(/(\d{1,2})\s*(?:de\s*)?([a-záéíóúñ]+)\s*(?:de\s*)?(\d{4})/i);
    if (!m) return null;

    const mes = meses[m[2].normalize("NFD").replace(/[\u0300-\u036f]/g, "")];
    if (mes === undefined) return null;

    const horaTexto = textoHora.trim().toLowerCase();
    const hm = horaTexto.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)?/i);
    if (!hm) return null;

    let hora = Number(hm[1]);
    const minuto = Number(hm[2] || 0);
    const periodo = (hm[3] || "").replace(/\s/g, "");

    if (periodo === "pm" && hora < 12) hora += 12;
    if (periodo === "am" && hora === 12) hora = 0;
    if (hora > 23 || minuto > 59) return null;

    return new Date(Number(m[3]), mes, Number(m[1]), hora, minuto, 0);
  }

  function obtenerEvento() {
    return convertirFecha(dateEl.textContent, timeEl.textContent);
  }

  function actualizar() {
    const evento = obtenerEvento();
    if (!evento || Number.isNaN(evento.getTime())) return;

    const diferencia = evento.getTime() - Date.now();

    if (diferencia <= 0) {
      daysEl.textContent = "0";
      hoursEl.textContent = "00";
      minutesEl.textContent = "00";
      secondsEl.textContent = "00";
      return;
    }

    const segundos = Math.floor(diferencia / 1000);
    const dias = Math.floor(segundos / 86400);
    const horas = Math.floor((segundos % 86400) / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segundosRestantes = segundos % 60;

    daysEl.textContent = dias;
    hoursEl.textContent = String(horas).padStart(2, "0");
    minutesEl.textContent = String(minutos).padStart(2, "0");
    secondsEl.textContent = String(segundosRestantes).padStart(2, "0");
  }

  // main.js puede tardar en colocar la fecha/hora; esperamos a que aparezcan.
  let intentos = 0;
  const iniciar = setInterval(function () {
    const evento = obtenerEvento();
    if (evento || intentos++ > 20) {
      clearInterval(iniciar);
      actualizar();
      setInterval(actualizar, 1000);
    }
  }, 250);
})();
