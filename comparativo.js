document.getElementById('btnComparePdf').onclick = async () => {
  const ym = document.getElementById('pdfMonthSelect').value;
  if(!ym) { alert("No hay mes seleccionado."); return; }
  
  const [y_yr, mStr] = ym.split('-');
  let mes = parseInt(mStr, 10);
  let anio = parseInt(y_yr, 10);
  mes--; if(mes === 0) { mes = 12; anio--; }
  const ymPasado = `${anio}-${mes.toString().padStart(2, '0')}`;
  
  const dataActual = registros.filter(r => r.fecha && r.fecha.startsWith(ym));
  const dataPasado = registros.filter(r => r.fecha && r.fecha.startsWith(ymPasado));
  
  if(!dataActual.length && !dataPasado.length) {
    alert("No hay registros suficientes para comparar.");
    return;
  }
  
  const btn = document.getElementById('btnComparePdf');
  const originalText = btn.innerHTML;
  btn.disabled = true;

  try {
    const mesLabelActual = monthNames[parseInt(mStr,10)-1];
    const mesLabelPasado = monthNames[mes-1];

    const PAGE_W = 1600;
    const PAGE_H = 1130;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [PAGE_W, PAGE_H] });

    // CSS y utilidades comunes
    const diffBadge = (d) => {
      if(d > 0) return `<span style="color:#10b981; font-weight:bold;">▲ +${d}</span>`;
      if(d < 0) return `<span style="color:#ef4444; font-weight:bold;">▼ ${d}</span>`;
      return `<span style="color:#94a3b8; font-weight:bold;">= 0</span>`;
    };
    const diffBadgeBg = (d) => {
      if(d > 0) return `<div style="padding: 4px 10px; background:#ecfdf5; color:#047857; border-radius:12px; font-weight:bold; font-size:14px; border:1px solid #a7f3d0;">▲ +${d}</div>`;
      if(d < 0) return `<div style="padding: 4px 10px; background:#fef2f2; color:#b91c1c; border-radius:12px; font-weight:bold; font-size:14px; border:1px solid #fecaca;">▼ ${d}</div>`;
      return `<div style="padding: 4px 10px; background:#f1f5f9; color:#64748b; border-radius:12px; font-weight:bold; font-size:14px; border:1px solid #e2e8f0;">= 0</div>`;
    };
    
    const CLINICAS_FULL = ['Tijuana', 'Mexicali - Obregón', 'Mexicali - Villa Verde', 'Ensenada'];
    const getClincName = (c) => c.replace('Mexicali - ', 'Mex-');

    const baseHtml = (title, content) => `
      <div style="width: 1600px; height: 1130px; background: #f8fafc; font-family: 'Inter', sans-serif; display: flex; color: #0f172a; box-sizing: border-box;">
        <!-- Sidebar Falso -->
        <div style="width: 80px; background: #ffffff; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; padding: 40px 0; gap: 24px;">
          <div style="width: 48px; height: 48px; border-radius: 12px; background: #0f172a; display:flex; align-items:center; justify-content:center; margin-bottom: 20px;">
            <div style="width:24px; height:24px; border:2px solid #fff; border-radius:4px;"></div>
          </div>
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #cbd5e1;"></div>
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #cbd5e1;"></div>
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #cbd5e1;"></div>
        </div>
        <!-- Main Content -->
        <div style="flex: 1; padding: 50px 70px; display: flex; flex-direction: column; box-sizing: border-box;">
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px;">
            <div>
              <div style="font-size: 18px; color: #64748B; margin-bottom: 8px;">Dental Más Fácil • Análisis Mensual</div>
              <h1 style="font-size: 42px; font-weight: 800; margin: 0; letter-spacing: -1px; color: #0f172a;">${title}</h1>
            </div>
            <div style="display: flex; gap: 12px; align-items: center;">
              <div style="padding: 10px 20px; border-radius: 999px; background: #fff; color: #64748B; border: 1px solid #e2e8f0; font-weight: 500; font-size: 15px;">vs ${mesLabelPasado}</div>
              <div style="padding: 10px 20px; border-radius: 999px; background: #0ea5e9; color: #fff; font-weight: 600; font-size: 15px;">${mesLabelActual} ${y_yr}</div>
            </div>
          </div>
          <div style="flex: 1; display: flex; flex-direction: column;">
            ${content}
          </div>
        </div>
      </div>
    `;

    // ==========================================
    // PAGE 1: RESUMEN GENERAL
    // ==========================================
    const tAct = dataActual.length; const tPas = dataPasado.length; const difT = tAct - tPas;
    const htmlPage1 = baseHtml("Dashboard General", `
      <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 30px; flex: 1;">
        
        <div style="display: flex; flex-direction: column; gap: 30px;">
          <!-- Card Total -->
          <div style="background: #fff; border-radius: 24px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); border: 1px solid #f1f5f9;">
            <h3 style="font-size: 18px; color: #64748b; margin: 0 0 20px 0; font-weight: 600; text-transform: uppercase;">Volumen Total</h3>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 80px; font-weight: 800; color: #0f172a; line-height: 1;">${tAct}</div>
              ${diffBadgeBg(difT)}
            </div>
            <div style="margin-top: 20px; font-size: 16px; color: #64748B;">Pacientes totales registrados en ${mesLabelActual}. El mes pasado hubo ${tPas}.</div>
          </div>
          
          <!-- Card Origenes Totales -->
          <div style="background: #fff; border-radius: 24px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; flex: 1; display: flex; flex-direction: column;">
            <h3 style="font-size: 18px; color: #64748b; margin: 0 0 20px 0; font-weight: 600; text-transform: uppercase;">Distribución de Origen</h3>
            <div style="flex: 1; position: relative; min-height: 250px;"><canvas id="chartP1_Donut"></canvas></div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 30px;">
          <!-- Card Clinicas Comparativa -->
          <div style="background: #fff; border-radius: 24px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; flex: 1; display: flex; flex-direction: column;">
            <h3 style="font-size: 18px; color: #64748b; margin: 0 0 20px 0; font-weight: 600; text-transform: uppercase;">Rendimiento Global por Clínica</h3>
            <div style="flex: 1; position: relative;"><canvas id="chartP1_Clinicas"></canvas></div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 30px; padding-top: 30px; border-top: 1px solid #f1f5f9;">
              ${CLINICAS_FULL.map(c => {
                const cA = dataActual.filter(r => r.clinica === c).length;
                const cP = dataPasado.filter(r => r.clinica === c).length;
                return `<div>
                  <div style="font-size: 14px; color: #64748b; margin-bottom: 8px;">${getClincName(c)}</div>
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 24px; font-weight: 800;">${cA}</span>
                    ${diffBadgeBg(cA - cP)}
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>

      </div>
    `);

    // ==========================================
    // PAGE 2: CUENTA PROPIA & DOCTORALIA
    // ==========================================
    const cpAct = dataActual.filter(r => r.origen && r.origen.includes('Cuenta propia')).length;
    const cpPas = dataPasado.filter(r => r.origen && r.origen.includes('Cuenta propia')).length;
    const docAct = dataActual.filter(r => r.origen && r.origen.includes('Doctoralia')).length;
    const docPas = dataPasado.filter(r => r.origen && r.origen.includes('Doctoralia')).length;

    const htmlPage2 = baseHtml("Análisis: Cuenta Propia y Doctoralia", `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
        <!-- Card CP -->
        <div style="background: #fff; border-radius: 24px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; border-left: 6px solid #3b82f6;">
          <h3 style="font-size: 18px; color: #64748b; margin: 0 0 20px 0; font-weight: 600; text-transform: uppercase;">Total Cuenta Propia</h3>
          <div style="display: flex; align-items: center; gap: 20px;">
            <div style="font-size: 72px; font-weight: 800; color: #0f172a; line-height: 1;">${cpAct}</div>
            ${diffBadgeBg(cpAct - cpPas)}
          </div>
        </div>
        <!-- Card Doctoralia -->
        <div style="background: #fff; border-radius: 24px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; border-left: 6px solid #0ea5e9;">
          <h3 style="font-size: 18px; color: #64748b; margin: 0 0 20px 0; font-weight: 600; text-transform: uppercase;">Total Doctoralia</h3>
          <div style="display: flex; align-items: center; gap: 20px;">
            <div style="font-size: 72px; font-weight: 800; color: #0f172a; line-height: 1;">${docAct}</div>
            ${diffBadgeBg(docAct - docPas)}
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; flex: 1;">
        <!-- Desglose CP Clínicas -->
        <div style="background: #fff; border-radius: 24px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; display: flex; flex-direction: column;">
          <h3 style="font-size: 18px; color: #64748b; margin: 0 0 30px 0; font-weight: 600; text-transform: uppercase;">Cuenta Propia por Clínica</h3>
          <div style="display: flex; flex-direction: column; gap: 20px; flex: 1;">
            ${CLINICAS_FULL.map(c => {
              const cpA = dataActual.filter(r => r.clinica === c && r.origen && r.origen.includes('Cuenta propia')).length;
              const cpP = dataPasado.filter(r => r.clinica === c && r.origen && r.origen.includes('Cuenta propia')).length;
              return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #f8fafc; border-radius: 16px;">
                  <div style="font-size: 18px; font-weight: 600;">${getClincName(c)}</div>
                  <div style="display: flex; align-items: center; gap: 24px;">
                    <div style="text-align: right;">
                      <div style="font-size: 14px; color: #64748b;">Mes pasado</div>
                      <div style="font-size: 20px; font-weight: 700; color: #94a3b8;">${cpP}</div>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-size: 14px; color: #3b82f6; font-weight: 600;">Mes actual</div>
                      <div style="font-size: 28px; font-weight: 800; color: #0f172a;">${cpA}</div>
                    </div>
                    <div style="width: 100px; text-align: right;">${diffBadgeBg(cpA - cpP)}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        
        <!-- Desglose Doctoralia Clínicas -->
        <div style="background: #fff; border-radius: 24px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; display: flex; flex-direction: column;">
          <h3 style="font-size: 18px; color: #64748b; margin: 0 0 30px 0; font-weight: 600; text-transform: uppercase;">Doctoralia por Clínica</h3>
          <div style="display: flex; flex-direction: column; gap: 20px; flex: 1;">
            ${CLINICAS_FULL.map(c => {
              const dA = dataActual.filter(r => r.clinica === c && r.origen && r.origen.includes('Doctoralia')).length;
              const dP = dataPasado.filter(r => r.clinica === c && r.origen && r.origen.includes('Doctoralia')).length;
              return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #f8fafc; border-radius: 16px;">
                  <div style="font-size: 18px; font-weight: 600;">${getClincName(c)}</div>
                  <div style="display: flex; align-items: center; gap: 24px;">
                    <div style="text-align: right;">
                      <div style="font-size: 14px; color: #64748b;">Mes pasado</div>
                      <div style="font-size: 20px; font-weight: 700; color: #94a3b8;">${dP}</div>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-size: 14px; color: #0ea5e9; font-weight: 600;">Mes actual</div>
                      <div style="font-size: 28px; font-weight: 800; color: #0f172a;">${dA}</div>
                    </div>
                    <div style="width: 100px; text-align: right;">${diffBadgeBg(dA - dP)}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `);

    // ==========================================
    // PAGE 3: ASESORES
    // ==========================================
    const todosAsesoresObj = {};
    dataActual.concat(dataPasado).forEach(r => {
      if(r.asesor && r.asesor !== 'Sin asignar' && r.asesor !== '—') todosAsesoresObj[r.asesor] = true;
    });
    let arrAsesores = Object.keys(todosAsesoresObj).map(a => {
      const aA = dataActual.filter(r => r.asesor === a).length;
      const aP = dataPasado.filter(r => r.asesor === a).length;
      return { nombre: a, act: aA, pas: aP, dif: aA - aP };
    }).sort((a,b) => b.dif - a.dif); // Ordenar por mayor crecimiento

    // Tomaremos top 6 asesores para no desbordar la UI, o hasta 8
    const topAsesores = arrAsesores.slice(0, 8);

    const htmlPage3 = baseHtml("Rendimiento por Asesor", `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; flex: 1;">
        ${topAsesores.map(as => {
          return `
            <div style="background: #fff; border-radius: 24px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.03); border: 1px solid #f1f5f9; display: flex; flex-direction: column;">
              <h3 style="font-size: 20px; color: #0f172a; margin: 0 0 16px 0; font-weight: 700; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px;">${as.nombre}</h3>
              
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <div>
                  <div style="font-size: 13px; color: #64748b; text-transform: uppercase;">Total Asistencias</div>
                  <div style="font-size: 36px; font-weight: 800; color: #0f172a;">${as.act}</div>
                </div>
                <div>${diffBadgeBg(as.dif)}</div>
              </div>

              <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">
                <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Desglose por clínica</div>
                ${CLINICAS_FULL.map(c => {
                  const cA = dataActual.filter(r => r.asesor === as.nombre && r.clinica === c).length;
                  const cP = dataPasado.filter(r => r.asesor === as.nombre && r.clinica === c).length;
                  if(cA === 0 && cP === 0) return '';
                  return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 8px;">
                      <div style="font-size: 14px; font-weight: 500; color: #334155;">${getClincName(c)}</div>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 16px; font-weight: 700;">${cA}</span>
                        <span style="font-size: 13px;">${diffBadge(cA - cP)}</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
        ${topAsesores.length === 0 ? '<div style="font-size: 20px; color:#64748b;">No hay asesores registrados en este periodo.</div>' : ''}
      </div>
    `);

    // ==========================================
    // PAGE 4: TENDENCIA DIARIA
    // ==========================================
    const htmlPage4 = baseHtml("Tendencia Diaria por Fechas", `
      <div style="background: #fff; border-radius: 30px; padding: 50px; box-shadow: 0 10px 40px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; flex: 1; display: flex; flex-direction: column;">
        <h3 style="font-size: 22px; color: #0f172a; margin: 0 0 10px 0; font-weight: 700;">Asistencias por Día (Mes a Mes)</h3>
        <p style="color: #64748b; font-size: 16px; margin: 0 0 40px 0;">Compara el ritmo de asistencia diario a lo largo del mes completo.</p>
        <div style="flex: 1; position: relative; width: 100%; min-height: 400px;">
          <canvas id="chartP4_Dias"></canvas>
        </div>
      </div>
    `);

    const pages = [htmlPage1, htmlPage2, htmlPage3, htmlPage4];

    // GENERAR PDF ITERANDO PAGINAS
    for(let i = 0; i < pages.length; i++) {
      btn.innerHTML = `Generando Hoja ${i+1} de 4...`;
      
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.innerHTML = pages[i];
      document.body.appendChild(container);

      // Render Charts for specific pages
      if(i === 0) {
        const countO = (d, orig) => d.filter(r => r.origen && r.origen.includes(orig)).length;
        new Chart(document.getElementById('chartP1_Donut').getContext('2d'), {
          type: 'doughnut',
          data: {
            labels: ["Cuenta propia", "Doctoralia", "Convenio", "Por asesor"],
            datasets: [{
              data: [countO(dataActual,"Cuenta propia"), countO(dataActual,"Doctoralia"), countO(dataActual,"Convenio"), countO(dataActual,"Por asesor")],
              backgroundColor: ['#3b82f6', '#0ea5e9', '#f97316', '#8b5cf6'],
              borderWidth: 0, cutout: '70%'
            }]
          },
          options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { position: 'right', labels: { font: { size: 16, family: 'Inter' }, padding: 20 } } } }
        });

        const actC = CLINICAS_FULL.map(c => dataActual.filter(r => r.clinica === c).length);
        const pasC = CLINICAS_FULL.map(c => dataPasado.filter(r => r.clinica === c).length);
        new Chart(document.getElementById('chartP1_Clinicas').getContext('2d'), {
          type: 'bar',
          data: {
            labels: CLINICAS_FULL.map(getClincName),
            datasets: [
              { label: mesLabelPasado, data: pasC, backgroundColor: '#cbd5e1', borderRadius: 8 },
              { label: mesLabelActual, data: actC, backgroundColor: '#0f172a', borderRadius: 8 }
            ]
          },
          options: { responsive: true, maintainAspectRatio: false, animation: false, scales: { x: { grid: { display: false } } } }
        });
      }



      if (i === 3) {
        const dias = Array.from({length: 31}, (_, i) => i + 1);
        const getDayCount = (data, d) => data.filter(r => {
           if(!r.fecha) return false;
           const parts = r.fecha.split('-'); // YYYY-MM-DD
           if(parts.length < 3) return false;
           return parseInt(parts[2], 10) === d;
        }).length;
        
        const trendAct = dias.map(d => getDayCount(dataActual, d));
        const trendPas = dias.map(d => getDayCount(dataPasado, d));
        
        new Chart(document.getElementById('chartP4_Dias').getContext('2d'), {
          type: 'line',
          data: {
            labels: dias,
            datasets: [
              { label: mesLabelPasado, data: trendPas, borderColor: '#cbd5e1', backgroundColor: 'transparent', tension: 0.4, borderDash: [5,5], pointRadius: 3 },
              { label: mesLabelActual, data: trendAct, borderColor: '#0ea5e9', backgroundColor: 'rgba(14,165,233,0.1)', fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#0ea5e9' }
            ]
          },
          options: { 
            responsive: true, maintainAspectRatio: false, animation: false,
            plugins: { legend: { position: 'top', align: 'end', labels: { font: { size: 16 } } } },
            scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
          }
        });
      }

      await new Promise(r => setTimeout(r, 800)); // wait for rendering
      const canvas = await html2canvas(container.children[0], { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        windowWidth: PAGE_W,
        windowHeight: PAGE_H
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      if(i > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, PAGE_W, PAGE_H);
      
      document.body.removeChild(container);
    }
    
    pdf.save(`Dashboard_Análisis_Comparativo_${mesLabelActual}_${y_yr}.pdf`);

  } catch(e) {
    console.error(e);
    alert("Error al generar PDF: " + e.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
};
