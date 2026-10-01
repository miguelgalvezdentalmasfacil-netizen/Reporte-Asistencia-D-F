// Generador de PDF con estilo Dashboard Moderno

document.getElementById('btnComparePdf').onclick = async () => {
  const ym = document.getElementById('pdfMonthSelect').value;
  if(!ym) {
    alert("No hay mes seleccionado.");
    return;
  }
  
  const [y_yr, mStr] = ym.split('-');
  let mes = parseInt(mStr, 10);
  let anio = parseInt(y_yr, 10);
  mes--;
  if(mes === 0) { mes = 12; anio--; }
  const ymPasado = `${anio}-${mes.toString().padStart(2, '0')}`;
  
  const dataActual = registros.filter(r => r.fecha && r.fecha.startsWith(ym));
  const dataPasado = registros.filter(r => r.fecha && r.fecha.startsWith(ymPasado));
  
  if(!dataActual.length && !dataPasado.length) {
    alert("No hay registros suficientes para comparar.");
    return;
  }
  
  const btn = document.getElementById('btnComparePdf');
  const originalText = btn.innerHTML;
  btn.innerHTML = "Generando Diseño...";
  btn.disabled = true;

  try {
    const mesLabelActual = monthNames[parseInt(mStr,10)-1];
    const mesLabelPasado = monthNames[mes-1];

    // Cálculos
    const tAct = dataActual.length;
    const tPas = dataPasado.length;
    const difT = tAct - tPas;
    const pIndAct = dataActual.filter(r => r.paquete === 'Individual').length;
    const pDuaAct = dataActual.filter(r => r.paquete === 'Dual' || r.paquete === 'Familiar').length;
    
    // Asesores (Mejor y Peor)
    const countAsesores = (data) => {
      let map = {};
      data.forEach(r => {
        if(r.asesor && r.asesor !== 'Sin asignar' && r.asesor !== '—') map[r.asesor] = (map[r.asesor] || 0) + 1;
      });
      return map;
    };
    const asesoresAct = countAsesores(dataActual);
    const asesoresPas = countAsesores(dataPasado);
    const todosAsesores = Array.from(new Set([...Object.keys(asesoresAct), ...Object.keys(asesoresPas)]));
    let crecimientos = todosAsesores.map(a => {
      const act = asesoresAct[a] || 0;
      const pas = asesoresPas[a] || 0;
      return { asesor: a, act, pas, dif: act - pas };
    }).sort((a,b) => b.dif - a.dif);
    
    const mejor = crecimientos.length > 0 && crecimientos[0].dif > 0 ? crecimientos[0] : null;
    const peor = crecimientos.length > 0 && crecimientos[crecimientos.length-1].dif < 0 ? crecimientos[crecimientos.length-1] : null;

    // Crear contenedor HTML oculto
    const container = document.createElement('div');
    container.id = 'pdf-render-container';
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '1600px';
    container.style.height = '950px'; 
    container.style.background = 'linear-gradient(to bottom right, #f4f7f6, #e9eff1)';
    container.style.fontFamily = "'Inter', sans-serif";
    container.style.color = '#1E293B';
    container.style.display = 'flex';
    container.style.boxSizing = 'border-box';
    
    // HTML Estructura (Inspirado en la imagen subida)
    container.innerHTML = `
      <!-- Sidebar Estético -->
      <div style="width: 100px; background: #ffffff; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; padding: 40px 0; gap: 30px;">
        <div style="width: 48px; height: 48px; border-radius: 12px; background: #0f172a; display:flex; align-items:center; justify-content:center; margin-bottom: 20px;">
          <div style="width:24px; height:24px; border:2px solid #fff; border-radius:4px;"></div>
        </div>
        <div style="width: 32px; height: 32px; border-radius: 50%; background: #e2e8f0;"></div>
        <div style="width: 32px; height: 32px; border-radius: 50%; background: #e2e8f0;"></div>
        <div style="width: 32px; height: 32px; border-radius: 50%; background: #e2e8f0;"></div>
        <div style="width: 32px; height: 32px; border-radius: 50%; background: #e2e8f0;"></div>
        <div style="flex: 1;"></div>
        <div style="width: 32px; height: 32px; border-radius: 50%; background: #e2e8f0;"></div>
      </div>
      
      <!-- Contenido Principal -->
      <div style="flex: 1; padding: 60px 80px; display: flex; flex-direction: column; gap: 40px; box-sizing: border-box;">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="font-size: 20px; color: #64748B; margin-bottom: 8px;">Dental Más Fácil • Analítica de Datos</div>
            <h1 style="font-size: 48px; font-weight: 700; margin: 0; letter-spacing: -1px; color: #0f172a;">Dashboard Comparativo</h1>
          </div>
          <div style="display: flex; gap: 12px; align-items: center;">
            <div style="padding: 12px 24px; border-radius: 999px; background: #fff; color: #64748B; border: 1px solid #e2e8f0; font-weight: 500; font-size: 16px;">Mes Anterior: ${mesLabelPasado}</div>
            <div style="padding: 12px 24px; border-radius: 999px; background: #0f172a; color: #fff; font-weight: 600; font-size: 16px;">Mes Actual: ${mesLabelActual}</div>
          </div>
        </div>
        
        <!-- Grid de Cards -->
        <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 30px; margin-top: 10px; flex: 1;">
          
          <!-- Columna 1: Resumen General y Origen -->
          <div style="display: flex; flex-direction: column; gap: 30px;">
            <div style="background: #ffffff; border-radius: 30px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.03);">
              <h3 style="font-size: 22px; color: #0f172a; margin: 0 0 24px 0; font-weight: 600;">Volumen Total</h3>
              <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                  <div style="font-size: 72px; font-weight: 700; color: #0f172a; line-height: 1;">${tAct}</div>
                  <div style="font-size: 18px; color: #64748B; margin-top: 12px;">Pacientes en ${mesLabelActual}</div>
                </div>
                <div style="padding: 16px 24px; border-radius: 20px; background: ${difT >= 0 ? '#ecfdf5' : '#fef2f2'}; border: 1px solid ${difT >= 0 ? '#a7f3d0' : '#fecaca'}; text-align: center;">
                  <div style="font-size: 24px; font-weight: 700; color: ${difT >= 0 ? '#047857' : '#b91c1c'};">${difT >= 0 ? '▲ +'+Math.abs(difT) : '▼ -'+Math.abs(difT)}</div>
                  <div style="font-size: 14px; font-weight: 500; color: ${difT >= 0 ? '#065f46' : '#991b1b'}; margin-top: 4px;">vs pasado</div>
                </div>
              </div>
            </div>
            
            <div style="background: #ffffff; border-radius: 30px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.03); flex: 1;">
               <h3 style="font-size: 22px; color: #0f172a; margin: 0 0 20px 0; font-weight: 600;">Asesores Destacados</h3>
               ${mejor ? `
                 <div style="margin-bottom: 24px;">
                   <div style="font-size: 14px; color: #10b981; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">🏆 Mayor Crecimiento</div>
                   <div style="font-size: 22px; font-weight: 600; color: #0f172a;">${mejor.asesor}</div>
                   <div style="font-size: 16px; color: #64748B;">+${mejor.dif} pacientes (Total: ${mejor.act})</div>
                 </div>
               ` : '<div style="color: #64748B;">Sin datos suficientes</div>'}
               ${peor ? `
                 <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #f1f5f9;">
                   <div style="font-size: 14px; color: #ef4444; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">📉 Mayor Caída</div>
                   <div style="font-size: 22px; font-weight: 600; color: #0f172a;">${peor.asesor}</div>
                   <div style="font-size: 16px; color: #64748B;">${peor.dif} pacientes (Total: ${peor.act})</div>
                 </div>
               ` : ''}
            </div>
          </div>

          <!-- Columna 2: Grafico Central (Donut) -->
          <div style="background: #ffffff; border-radius: 30px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.03); display: flex; flex-direction: column;">
            <div style="display:flex; justify-content: space-between; align-items:flex-start;">
              <div>
                <h3 style="font-size: 22px; color: #0f172a; margin: 0 0 8px 0; font-weight: 600;">Desglose de Origen</h3>
                <p style="color: #64748B; margin: 0 0 40px 0; font-size: 16px;">Mes Actual (${mesLabelActual})</p>
              </div>
              <div style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; color:#64748B;">↗</div>
            </div>
            
            <div style="flex: 1; position: relative;">
              <canvas id="pdfChartDonut"></canvas>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 40px;">
              ${["Cuenta propia", "Doctoralia", "Convenio", "Por asesor"].map((orig, i) => {
                const colors = ['#3b82f6', '#0ea5e9', '#f97316', '#8b5cf6'];
                const oAct = dataActual.filter(r => r.origen && r.origen.includes(orig)).length;
                return `
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 14px; height: 14px; border-radius: 50%; background: ${colors[i]};"></div>
                    <div>
                      <div style="font-size: 14px; color: #64748B;">${orig}</div>
                      <div style="font-weight: 700; color: #0f172a; font-size: 18px;">${oAct}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Columna 3: Tendencias (Barras Clinicas) -->
          <div style="background: #ffffff; border-radius: 30px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.03); display: flex; flex-direction: column;">
            <div style="display:flex; justify-content: space-between; align-items:flex-start;">
              <div>
                <h3 style="font-size: 22px; color: #0f172a; margin: 0 0 8px 0; font-weight: 600;">Rendimiento por Clínica</h3>
                <p style="color: #64748B; margin: 0 0 30px 0; font-size: 16px;">Comparativa Mensual</p>
              </div>
              <div style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; color:#64748B;">⇌</div>
            </div>
            
            <div style="flex: 1; position: relative;">
              <canvas id="pdfChartClinicas"></canvas>
            </div>
            
            <div style="margin-top: 30px; padding-top: 24px; border-top: 1px solid #f1f5f9; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              ${["Tijuana", "Mexicali - Obregón", "Mexicali - Villa Verde", "Ensenada"].map(clinica => {
                const cAct = dataActual.filter(r => r.clinica === clinica).length;
                const cPas = dataPasado.filter(r => r.clinica === clinica).length;
                const dif = cAct - cPas;
                return `
                  <div>
                    <div style="font-size: 14px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${clinica.replace('Mexicali - ', 'Mex-')}</div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-size: 20px; font-weight: 700; color: #0f172a;">${cAct}</span>
                      <span style="font-size: 14px; font-weight: 600; color: ${dif >= 0 ? '#10b981' : '#ef4444'}">${dif > 0 ? '▲ +'+dif : dif < 0 ? '▼ '+dif : '= 0'}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          
        </div>

      </div>
    `;

    document.body.appendChild(container);

    // Renderizar Gráficos con Chart.js
    const ctxDonut = document.getElementById('pdfChartDonut').getContext('2d');
    
    const countO = (orig) => dataActual.filter(r => r.origen && r.origen.includes(orig)).length;
    new Chart(ctxDonut, {
      type: 'doughnut',
      data: {
        labels: ["Cuenta propia", "Doctoralia", "Convenio", "Por asesor"],
        datasets: [{
          data: [countO("Cuenta propia"), countO("Doctoralia"), countO("Convenio"), countO("Por asesor")],
          backgroundColor: ['#3b82f6', '#0ea5e9', '#f97316', '#8b5cf6'],
          borderWidth: 0,
          cutout: '75%'
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } } }
    });

    const ctxClinicas = document.getElementById('pdfChartClinicas').getContext('2d');
    const clinicasLabels = ['Tijuana', 'Mex-Obr', 'Mex-VV', 'Ensenada'];
    const clinicasFull = ['Tijuana', 'Mexicali - Obregón', 'Mexicali - Villa Verde', 'Ensenada'];
    const actClinicas = clinicasFull.map(c => dataActual.filter(r => r.clinica === c).length);
    const pasClinicas = clinicasFull.map(c => dataPasado.filter(r => r.clinica === c).length);

    new Chart(ctxClinicas, {
      type: 'line',
      data: {
        labels: clinicasLabels,
        datasets: [
          { 
            label: mesLabelPasado, data: pasClinicas, borderColor: '#cbd5e1', 
            backgroundColor: '#cbd5e1', tension: 0.4, borderDash: [5, 5]
          },
          { 
            label: mesLabelActual, data: actClinicas, borderColor: '#0ea5e9', 
            backgroundColor: 'rgba(14, 165, 233, 0.1)', fill: true, tension: 0.4 
          }
        ]
      },
      options: { 
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 12, usePointStyle: true } } },
        scales: { 
          x: { grid: { display: false } }, 
          y: { display: false, min: 0 } 
        }
      }
    });

    // Esperar un momento
    await new Promise(r => setTimeout(r, 1000));

    const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL('image/png');

    const { jsPDF } = window.jspdf;
    const pdfCustom = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1600, 950] });
    pdfCustom.addImage(imgData, 'PNG', 0, 0, 1600, 950);
    
    pdfCustom.save(`Dashboard_Comparativo_${mesLabelActual}_${y_yr}.pdf`);

    document.body.removeChild(container);
    
  } catch(e) {
    console.error(e);
    alert("Error al generar PDF: " + e.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
};
