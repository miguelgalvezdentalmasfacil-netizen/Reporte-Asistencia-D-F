// script para análisis comparativo

document.getElementById('btnComparePdf').onclick = async () => {
  const ym = document.getElementById('pdfMonthSelect').value;
  if(!ym) {
    alert("No hay mes seleccionado.");
    return;
  }
  
  // Calcular mes anterior
  const [y_yr, mStr] = ym.split('-');
  let mes = parseInt(mStr, 10);
  let anio = parseInt(y_yr, 10);
  mes--;
  if(mes === 0) {
    mes = 12;
    anio--;
  }
  const ymPasado = `${anio}-${mes.toString().padStart(2, '0')}`;
  
  const dataActual = registros.filter(r => r.fecha && r.fecha.startsWith(ym));
  const dataPasado = registros.filter(r => r.fecha && r.fecha.startsWith(ymPasado));
  
  if(!dataActual.length && !dataPasado.length) {
    alert("No hay registros ni en este mes ni en el anterior para comparar.");
    return;
  }
  
  const btn = document.getElementById('btnComparePdf');
  const originalText = btn.innerHTML;
  btn.innerHTML = "Generando...";
  btn.disabled = true;
  
  try {
    const mesLabelActual = monthNames[parseInt(mStr,10)-1];
    const mesLabelPasado = monthNames[mes-1];
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const PRIMARY_COLOR = [3, 105, 161];
    const TEXT_COLOR = [30, 41, 59];
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.text("Análisis Comparativo Mensual", 14, 25);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`${mesLabelPasado} ${anio} vs ${mesLabelActual} ${y_yr}`, 14, 33);
    
    // helper functions
    const diffText = (act, pas) => {
      const d = act - pas;
      if(d > 0) return `(+${d} pacientes)`;
      if(d < 0) return `(${d} pacientes)`;
      return `(Sin cambios)`;
    };
    
    let yPos = 50;
    
    // Totales
    const tAct = dataActual.length;
    const tPas = dataPasado.length;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
    doc.text("1. Volumen Total de Asistencias", 14, yPos);
    yPos += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Mes actual (${mesLabelActual}): ${tAct} pacientes`, 14, yPos); yPos += 6;
    doc.text(`Mes anterior (${mesLabelPasado}): ${tPas} pacientes`, 14, yPos); yPos += 6;
    
    if (tAct > tPas) {
      doc.setTextColor(16, 185, 129); // verde
      doc.text(`¡Crecimiento! Hubo un aumento de ${tAct - tPas} pacientes.`, 14, yPos);
    } else if (tAct < tPas) {
      doc.setTextColor(239, 68, 68); // rojo
      doc.text(`Disminución de ${tPas - tAct} pacientes respecto al mes anterior.`, 14, yPos);
    } else {
      doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
      doc.text(`El volumen se mantuvo exactamente igual.`, 14, yPos);
    }
    
    yPos += 15;
    doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
    
    // Por Clinica
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("2. Desempeño por Clínica", 14, yPos);
    yPos += 8;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    CLINICAS.forEach(c => {
      const cAct = dataActual.filter(r => r.clinica === c).length;
      const cPas = dataPasado.filter(r => r.clinica === c).length;
      
      let res = `${c}: ${cAct} (antes ${cPas}) `;
      const dif = cAct - cPas;
      
      doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
      doc.text(res, 14, yPos);
      
      if(dif > 0) {
        doc.setTextColor(16, 185, 129);
        doc.text(`+${dif} ▲`, 14 + doc.getTextWidth(res), yPos);
      } else if (dif < 0) {
        doc.setTextColor(239, 68, 68);
        doc.text(`${dif} ▼`, 14 + doc.getTextWidth(res), yPos);
      } else {
        doc.setTextColor(150, 150, 150);
        doc.text(`=`, 14 + doc.getTextWidth(res), yPos);
      }
      yPos += 6;
    });
    
    yPos += 10;
    doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
    
    // Por Origen
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("3. Desempeño por Origen", 14, yPos);
    yPos += 8;
    
    const countOrg = (data, val) => data.filter(r => r.origen && r.origen.includes(val)).length;
    const origenes = [
      { label: "Cuenta Propia", val: "Cuenta propia" },
      { label: "Doctoralia", val: "Doctoralia" },
      { label: "Convenio", val: "Convenio" },
      { label: "Por Asesor", val: "Por asesor" }
    ];
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    origenes.forEach(org => {
      const oAct = countOrg(dataActual, org.val);
      const oPas = countOrg(dataPasado, org.val);
      
      let res = `${org.label}: ${oAct} (antes ${oPas}) `;
      const dif = oAct - oPas;
      
      doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
      doc.text(res, 14, yPos);
      
      if(dif > 0) {
        doc.setTextColor(16, 185, 129);
        doc.text(`+${dif} ▲`, 14 + doc.getTextWidth(res), yPos);
      } else if (dif < 0) {
        doc.setTextColor(239, 68, 68);
        doc.text(`${dif} ▼`, 14 + doc.getTextWidth(res), yPos);
      }
      yPos += 6;
    });
    
    yPos += 10;
    
    // Mejores y peores asesores
    doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("4. Análisis de Asesores", 14, yPos);
    yPos += 8;
    
    const countAsesores = (data) => {
      let map = {};
      data.forEach(r => {
        if(r.asesor && r.asesor !== 'Sin asignar' && r.asesor !== '—') {
          map[r.asesor] = (map[r.asesor] || 0) + 1;
        }
      });
      return map;
    };
    
    const asesoresAct = countAsesores(dataActual);
    const asesoresPas = countAsesores(dataPasado);
    
    const todosAsesores = Array.from(new Set([...Object.keys(asesoresAct), ...Object.keys(asesoresPas)]));
    let crecimientos = [];
    todosAsesores.forEach(a => {
      const act = asesoresAct[a] || 0;
      const pas = asesoresPas[a] || 0;
      crecimientos.push({ asesor: a, act, pas, dif: act - pas });
    });
    
    crecimientos.sort((a,b) => b.dif - a.dif); // mayor crecimiento primero
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    
    if(crecimientos.length > 0) {
      const mejor = crecimientos[0];
      const peor = crecimientos[crecimientos.length - 1];
      
      if (mejor.dif > 0) {
        doc.text(`🏆 Mayor mejora: ${mejor.asesor} con +${mejor.dif} pacientes (Total: ${mejor.act}).`, 14, yPos);
        yPos += 7;
      }
      if (peor.dif < 0) {
        doc.text(`📉 Mayor caída: ${peor.asesor} bajó ${Math.abs(peor.dif)} pacientes (Total: ${peor.act}).`, 14, yPos);
        yPos += 7;
      }
      
      yPos += 4;
      doc.text("Todos los asesores:", 14, yPos);
      yPos += 6;
      crecimientos.forEach(c => {
        let res = `- ${c.asesor}: ${c.act} (antes ${c.pas}) `;
        doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
        doc.text(res, 14, yPos);
        if(c.dif > 0) { doc.setTextColor(16, 185, 129); doc.text(`+${c.dif} ▲`, 14 + doc.getTextWidth(res), yPos); }
        else if(c.dif < 0) { doc.setTextColor(239, 68, 68); doc.text(`${c.dif} ▼`, 14 + doc.getTextWidth(res), yPos); }
        yPos += 5;
        
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
      });
    } else {
      doc.text("No hubo registros de asesores en estos meses.", 14, yPos);
    }
    
    doc.save(`Analisis_Comparativo_${mesLabelActual}_${y_yr}.pdf`);
  } catch(e) {
    console.error(e);
    alert("Error al generar PDF: " + e.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
};
