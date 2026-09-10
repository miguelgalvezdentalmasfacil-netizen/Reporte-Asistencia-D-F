/**
 * REGISTRO DE ASISTENCIA — Dental Más Fácil
 * Backend de Google Apps Script
 */

const SHEET_NAME = 'Registros';
const HEADERS = ['ID', 'Fecha asistencia', 'Paciente', 'Clínica', 'Asesor', 'Paquete', 'Origen', 'Registrado el'];

const SHEET_CITAS = 'Citas';
const CITAS_HEADERS = ['ID', 'Fecha', 'Hora', 'Sucursal', 'Doctor', 'Asesor', 'Paciente', 'Genero', 'Edad',
  'TipoPaciente', 'TipoCita', 'Tratamiento', 'Cotizacion', 'Motivo', 'Decision', 'Alergias', 'Notas',
  'Fuente', 'Lead', 'Estado', 'RegistradoEl'];

const VIEW_ASESOR_SHEET = 'Por Asesor';
const VIEW_CUENTA_PROPIA_SHEET = 'Cuenta Propia por Clínica';
const VIEW_CONVENIO_SHEET = 'Convenio por Clínica';
const VIEW_RESUMEN_SHEET = 'Resumen Mensual';

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const CLINICA_CORTA = {
  'Tijuana': 'RIO',
  'Mexicali - Obregón': 'OBREGON',
  'Mexicali - Villa Verde': 'VILLA VERDE',
  'Ensenada': 'ENSENADA'
};

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange
    .setFontWeight('bold')
    .setFontColor('#FFFFFF')
    .setBackground('#0F7A6E')
    .setFontSize(10)
    .setHorizontalAlignment('center');

  sheet.setFrozenRows(1);

  const widths = [40, 130, 220, 200, 170, 110, 130, 170];
  widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  sheet.hideColumns(1); 

  sheet.getRange('B2:B2000').setNumberFormat('yyyy-mm-dd');
  sheet.getRange('H2:H2000').setNumberFormat('yyyy-mm-dd hh:mm:ss');

  const clinicaRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Tijuana', 'Mexicali - Obregón', 'Mexicali - Villa Verde', 'Ensenada'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('D2:D2000').setDataValidation(clinicaRule);

  const paqueteRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Individual', 'Dual', 'Familiar'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('F2:F2000').setDataValidation(paqueteRule);

  const origenRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Cuenta propia', 'Convenio', 'Por asesor', 'Cuenta propia, Por asesor', 'Convenio, Por asesor'], true)
    .setAllowInvalid(true) 
    .build();
  sheet.getRange('G2:G2000').setDataValidation(origenRule);

  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Hoja 1');
  if (defaultSheet && defaultSheet.getLastRow() === 0 && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  SpreadsheetApp.flush();
  Logger.log('Hoja "Registros" lista con columnas, formato y validaciones.');

  generarVistaPorAsesor();
  generarVistaCuentaPropia();
  generarVistaConvenio();
  generarResumenMensual();

  instalarTriggerActualizacion();

  getOrCreateCitasSheet_();
}

function instalarTriggerActualizacion() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'alCambiarHoja') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('alCambiarHoja')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onChange()
    .create();
}

function alCambiarHoja(e) {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('dmf_actualizando') === '1') return; 
  if (e && e.changeType && ['REMOVE_ROW', 'INSERT_ROW', 'EDIT', 'REMOVE_GRID', 'INSERT_GRID', 'OTHER'].indexOf(e.changeType) === -1) return;

  props.setProperty('dmf_actualizando', '1');
  try {
    actualizarVistas();
  } finally {
    props.deleteProperty('dmf_actualizando');
  }
}

function getRegistros_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return values
    .filter(row => row[2]) 
    .map(row => {
      const f = row[1] instanceof Date ? row[1] : new Date(row[1]);
      let mk = '';
      try { mk = Utilities.formatDate(f, Session.getScriptTimeZone(), 'yyyy-MM'); } catch(e){}
      return {
        id: row[0],
        nombre: row[2],
        fecha: f,
        mesKey: mk,
        clinica: row[3],
        clinicaCorta: CLINICA_CORTA[row[3]] || row[3],
        asesor: row[4] || 'Sin asignar',
        paquete: row[5],
        origen: row[6]
      };
    });
}

function escribirBloque_(sheet, colStart, asesorNombre, filas, separatorRows) {
  sheet.getRange(1, colStart, 1, 2).merge().setValue(asesorNombre)
    .setFontWeight('bold').setFontSize(10).setHorizontalAlignment('left').setFontColor('#5E7975');

  const headers = ['NOMBRE DEL PACIENTE', 'FECHA', 'SUCURSAL', 'ASESOR'];
  sheet.getRange(2, colStart, 1, 4)
    .setValues([headers])
    .setBackground('#B7CDEF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  if (filas.length > 0) {
    sheet.getRange(3, colStart, filas.length, 4).setValues(filas);
    sheet.getRange(3, colStart + 1, filas.length, 1).setNumberFormat('dd/mm/yy');
    sheet.getRange(3, colStart + 3, filas.length, 1).setFontWeight('bold');
    
    if (separatorRows && separatorRows.length > 0) {
      separatorRows.forEach(rowOffset => {
        const rowRange = sheet.getRange(3 + rowOffset, colStart, 1, 4);
        rowRange.setBackground('#EAF0EE').setFontWeight('bold').setFontColor('#0F7A6E');
        sheet.getRange(3 + rowOffset, colStart + 1).setNumberFormat('@'); // Texto normal para que no intente ser fecha
      });
    }
  }

  sheet.setColumnWidth(colStart, 220);
  sheet.setColumnWidth(colStart + 1, 80);
  sheet.setColumnWidth(colStart + 2, 110);
  sheet.setColumnWidth(colStart + 3, 100);
}

function generarVistaPorAsesor() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(VIEW_ASESOR_SHEET);
  if (!sheet) sheet = ss.insertSheet(VIEW_ASESOR_SHEET);
  sheet.clear();

  const registros = getRegistros_().filter(r => r.asesor && r.asesor !== 'Sin asignar' && r.asesor !== '—');
  
  // Agrupar asesores y meses
  const asesoresSet = new Set();
  const mesesSet = new Set();
  registros.forEach(r => {
    asesoresSet.add(r.asesor);
    if(r.mesKey) mesesSet.add(r.mesKey);
  });
  
  const asesores = Array.from(asesoresSet).sort();
  const mesesGlobales = Array.from(mesesSet).sort();
  
  // Calcular el maximo de filas que ocupará cada mes
  const maxPorMes = {};
  mesesGlobales.forEach(m => {
    let max = 0;
    asesores.forEach(a => {
      const count = registros.filter(r => r.asesor === a && r.mesKey === m).length;
      if (count > max) max = count;
    });
    maxPorMes[m] = max;
  });

  const BLOCK_COLS = 4;
  const GAP = 1;
  let colStart = 1;

  asesores.forEach(asesor => {
    let filasFinales = [];
    let separatorRows = [];

    mesesGlobales.forEach((mesKey, index) => {
      const rowsMes = registros.filter(r => r.asesor === asesor && r.mesKey === mesKey).sort((a,b) => a.fecha - b.fecha);
      
      const [anio, mesNum] = mesKey.split('-');
      const nombreMes = MESES_ES[parseInt(mesNum, 10) - 1].toUpperCase() + ' ' + anio;
      
      // Espacio en blanco antes de un nuevo mes (para que no pegue)
      if (index > 0) {
        filasFinales.push(['', '', '', '']);
      }

      separatorRows.push(filasFinales.length);
      filasFinales.push([`--- ${nombreMes} ---`, '', '', `${rowsMes.length} pac.`]);
      
      rowsMes.forEach(r => {
        filasFinales.push([r.nombre, r.fecha, r.clinicaCorta, asesor.toUpperCase()]);
      });
      
      // Rellenar con vacíos para alinear horizontalmente con los demás
      const padding = maxPorMes[mesKey] - rowsMes.length;
      for (let i = 0; i < padding; i++) {
        filasFinales.push(['', '', '', '']);
      }
    });

    escribirBloque_(sheet, colStart, asesor.toUpperCase(), filasFinales, separatorRows);
    colStart += BLOCK_COLS + GAP;
  });

  sheet.setFrozenRows(2);
}

function escribirBloqueClinica_(sheet, colStart, clinicaNombre, filas, header3, separatorRows) {
  sheet.getRange(1, colStart, 1, 2).merge().setValue(clinicaNombre)
    .setFontWeight('bold').setFontSize(9).setHorizontalAlignment('left').setFontColor('#5E7975');

  const headers = ['NOMBRE DEL PACIENTE', 'FECHA', header3];
  sheet.getRange(2, colStart, 1, 3)
    .setValues([headers])
    .setBackground('#B7CDEF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  if (filas.length > 0) {
    sheet.getRange(3, colStart, filas.length, 3).setValues(filas);
    sheet.getRange(3, colStart + 1, filas.length, 1).setNumberFormat('dd/mm/yy');
    sheet.getRange(3, colStart + 2, filas.length, 1).setFontWeight('bold');
    
    if (separatorRows && separatorRows.length > 0) {
      separatorRows.forEach(rowOffset => {
        const rowRange = sheet.getRange(3 + rowOffset, colStart, 1, 3);
        rowRange.setBackground('#EAF0EE').setFontWeight('bold').setFontColor('#0F7A6E');
        sheet.getRange(3 + rowOffset, colStart + 1).setNumberFormat('@');
      });
    }
  }

  sheet.setColumnWidth(colStart, 220);
  sheet.setColumnWidth(colStart + 1, 80);
  sheet.setColumnWidth(colStart + 2, 170);
}

function generarVistaPorOrigen_(nombreHoja, origen) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(nombreHoja);
  if (!sheet) sheet = ss.insertSheet(nombreHoja);
  sheet.clear();

  const registros = getRegistros_().filter(r => {
    if (!r.origen) return false;
    const valores = String(r.origen).split(',').map(s => s.trim());
    return valores.includes(origen);
  });
  
  const clinicasSet = new Set();
  const mesesSet = new Set();
  registros.forEach(r => {
    clinicasSet.add(r.clinicaCorta);
    if(r.mesKey) mesesSet.add(r.mesKey);
  });

  const clinicasOrdenadas = Array.from(clinicasSet).sort();
  const mesesGlobales = Array.from(mesesSet).sort();

  const maxPorMes = {};
  mesesGlobales.forEach(m => {
    let max = 0;
    clinicasOrdenadas.forEach(c => {
      const count = registros.filter(r => r.clinicaCorta === c && r.mesKey === m).length;
      if (count > max) max = count;
    });
    maxPorMes[m] = max;
  });

  const BLOCK_COLS = 3;
  const GAP = 1;
  let colStart = 1;
  const header3 = origen === 'Cuenta propia' ? 'CLÍNICA' : 'ORIGEN';

  clinicasOrdenadas.forEach(clinica => {
    let filasFinales = [];
    let separatorRows = [];

    mesesGlobales.forEach((mesKey, index) => {
      const rowsMes = registros.filter(r => r.clinicaCorta === clinica && r.mesKey === mesKey).sort((a,b) => a.fecha - b.fecha);
      
      const [anio, mesNum] = mesKey.split('-');
      const nombreMes = MESES_ES[parseInt(mesNum, 10) - 1].toUpperCase() + ' ' + anio;
      
      // Espacio en blanco antes de un nuevo mes
      if (index > 0) {
        filasFinales.push(['', '', '']);
      }

      separatorRows.push(filasFinales.length);
      filasFinales.push([`--- ${nombreMes} ---`, '', `${rowsMes.length} pac.`]);
      
      rowsMes.forEach(r => {
        const tieneAsesor = r.asesor && r.asesor !== 'Sin asignar' && r.asesor !== '—';
        const valorCol3 = origen === 'Cuenta propia'
          ? clinica
          : (tieneAsesor ? 'Asesor: ' + r.asesor.toUpperCase() : 'Cuenta propia (clínica)');
        filasFinales.push([r.nombre, r.fecha, valorCol3]);
      });

      // Rellenar con vacíos
      const padding = maxPorMes[mesKey] - rowsMes.length;
      for (let i = 0; i < padding; i++) {
        filasFinales.push(['', '', '']);
      }
    });

    escribirBloqueClinica_(sheet, colStart, clinica, filasFinales, header3, separatorRows);
    colStart += BLOCK_COLS + GAP;
  });

  sheet.setFrozenRows(2);
}

function generarVistaCuentaPropia() {
  generarVistaPorOrigen_(VIEW_CUENTA_PROPIA_SHEET, 'Cuenta propia');
}

function generarVistaConvenio() {
  generarVistaPorOrigen_(VIEW_CONVENIO_SHEET, 'Convenio');
}

function origenIncluye_(origenStr, valor) {
  if (!origenStr) return false;
  return String(origenStr).split(',').map(s => s.trim()).includes(valor);
}

function contarPor_(lista, keyFn) {
  const conteo = {};
  lista.forEach(r => {
    const k = keyFn(r) || 'Sin asignar';
    conteo[k] = (conteo[k] || 0) + 1;
  });
  return conteo;
}

function escribirSeccionResumen_(sheet, colStart, rowStart, titulo, conteoObj) {
  let row = rowStart;
  sheet.getRange(row, colStart, 1, 2).merge().setValue(titulo)
    .setBackground('#B7CDEF').setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center');
  row++;

  const claves = Object.keys(conteoObj).sort();
  if (claves.length === 0) {
    sheet.getRange(row, colStart).setValue('— sin datos —').setFontColor('#8CA3A0').setFontStyle('italic');
    row++;
  } else {
    claves.forEach(k => {
      sheet.getRange(row, colStart).setValue(k);
      sheet.getRange(row, colStart + 1).setValue(conteoObj[k]).setHorizontalAlignment('center').setFontWeight('bold');
      row++;
    });
    const total = claves.reduce((sum, k) => sum + conteoObj[k], 0);
    sheet.getRange(row, colStart).setValue('TOTAL').setFontWeight('bold').setBackground('#EAF0EE');
    sheet.getRange(row, colStart + 1).setValue(total).setFontWeight('bold').setHorizontalAlignment('center').setBackground('#EAF0EE');
    row++;
  }
  return row + 1; 
}

function generarResumenMensual() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(VIEW_RESUMEN_SHEET);
  if (!sheet) sheet = ss.insertSheet(VIEW_RESUMEN_SHEET);
  sheet.clear();

  const registros = getRegistros_();
  const porMes = {};
  registros.forEach(r => {
    const key = Utilities.formatDate(r.fecha, Session.getScriptTimeZone(), 'yyyy-MM');
    if (!porMes[key]) porMes[key] = [];
    porMes[key].push(r);
  });

  const mesesOrdenados = Object.keys(porMes).sort();
  const BLOCK_COLS = 3; 
  let colStart = 1;

  mesesOrdenados.forEach(mesKey => {
    const grupo = porMes[mesKey];
    const [anio, mesNum] = mesKey.split('-');
    const nombreMes = MESES_ES[parseInt(mesNum, 10) - 1] + ' ' + anio;
    let row = 1;

    sheet.getRange(row, colStart, 1, 2).merge().setValue(nombreMes.toUpperCase())
      .setBackground('#0F7A6E').setFontColor('#FFFFFF').setFontWeight('bold').setHorizontalAlignment('center');
    row++;
    sheet.getRange(row, colStart).setValue('Total pacientes').setFontWeight('bold');
    sheet.getRange(row, colStart + 1).setValue(grupo.length).setFontWeight('bold').setHorizontalAlignment('center');
    row += 2;

    const conAsesor = grupo.filter(r => r.asesor && r.asesor !== 'Sin asignar' && r.asesor !== '—');
    row = escribirSeccionResumen_(sheet, colStart, row, 'POR ASESOR', contarPor_(conAsesor, r => r.asesor));

    row = escribirSeccionResumen_(sheet, colStart, row, 'POR CLÍNICA',
      contarPor_(grupo, r => CLINICA_CORTA[r.clinica] || r.clinica));

    const sinAsesor = grupo.filter(r => !r.asesor || r.asesor === 'Sin asignar' || r.asesor === '—');
    row = escribirSeccionResumen_(sheet, colStart, row, 'CUENTA PROPIA POR CLÍNICA',
      contarPor_(sinAsesor, r => CLINICA_CORTA[r.clinica] || r.clinica));

    const asesorClinica = {};
    conAsesor.forEach(r => {
      const clave = r.asesor + ' — ' + (CLINICA_CORTA[r.clinica] || r.clinica);
      asesorClinica[clave] = (asesorClinica[clave] || 0) + 1;
    });
    row = escribirSeccionResumen_(sheet, colStart, row, 'ASESOR POR CLÍNICA', asesorClinica);

    const convenio = grupo.filter(r => origenIncluye_(r.origen, 'Convenio'));
    row = escribirSeccionResumen_(sheet, colStart, row, 'CONVENIO (APARTE)', {
      'De clínica (cuenta propia)': convenio.filter(r => origenIncluye_(r.origen, 'Cuenta propia')).length,
      'De asesor': convenio.filter(r => origenIncluye_(r.origen, 'Por asesor')).length
    });

    sheet.setColumnWidth(colStart, 210);
    sheet.setColumnWidth(colStart + 1, 70);
    colStart += BLOCK_COLS;
  });

  sheet.setFrozenRows(1);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Registro DMF')
    .addItem('🔄 Actualizar vistas (Asesor / Cuenta Propia / Convenio / Resumen)', 'actualizarVistas')
    .addItem('⚙️ Configurar hoja Registros (una sola vez)', 'setupSheet')
    .addItem('🔁 Reactivar auto-actualización al editar/borrar', 'instalarTriggerActualizacion')
    .addToUi();
}

function actualizarVistas() {
  generarVistaPorAsesor();
  generarVistaCuentaPropia();
  generarVistaConvenio();
  generarResumenMensual();
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.accion === 'eliminar') {
      return eliminarRegistro_(data.id);
    }
    if (data.accion === 'crearCita') {
      return crearCita_(data);
    }
    if (data.accion === 'marcarAsistencia') {
      return marcarAsistencia_(data);
    }
    return crearRegistro_(data);
  } catch (err) {
    return jsonOutput_({ status: 'error', message: err.message });
  }
}

function crearRegistro_(data) {
  const id = insertarRegistro_(data);
  return jsonOutput_({ status: 'ok', id: id });
}

function insertarRegistro_(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const id = data.id || Date.now();

  // 1. PRIMERO dispara la notificación a tu celular (inmediato)
  enviarNotificacionOneSignal(data.nombre || 'Paciente', data.clinica || 'Clínica no especificada', id);

  // 2. LUEGO guarda el registro en Google Sheets
  sheet.appendRow([
    id,
    data.fecha || '',
    data.nombre || '',
    data.clinica || '',
    data.asesor || '',
    data.paquete || '',
    data.origen || '',
    new Date()
  ]);

  // 3. HASTA EL FINAL actualiza las tablas (el paso más pesado y lento)
  actualizarVistas();

  return id;
}

function eliminarRegistro_(id) {
  if (!id) return jsonOutput_({ status: 'error', message: 'Falta el id a eliminar' });

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonOutput_({ status: 'error', message: 'No hay registros' });

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      sheet.deleteRow(i + 2);
      actualizarVistas();
      return jsonOutput_({ status: 'ok' });
    }
  }
  return jsonOutput_({ status: 'error', message: 'No se encontró ese registro (puede que ya se haya borrado)' });
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  if (e && e.parameter && e.parameter.tipo === 'citas') {
    return obtenerCitas_(e);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return jsonOutput_([]);
  }

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const records = values.map(row => ({
    id: row[0],
    fecha: row[1] instanceof Date ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : row[1],
    nombre: row[2],
    clinica: row[3],
    asesor: row[4],
    paquete: row[5],
    origen: row[6]
  }));

  return jsonOutput_(records);
}

function getOrCreateCitasSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_CITAS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CITAS);
    sheet.getRange(1, 1, 1, CITAS_HEADERS.length).setValues([CITAS_HEADERS])
      .setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0F7A6E').setFontSize(10);
    sheet.setFrozenRows(1);
    sheet.hideColumns(1);
  }
  return sheet;
}

function crearCita_(data) {
  const sheet = getOrCreateCitasSheet_();
  const id = data.id || Date.now();

  sheet.appendRow([
    id,
    data.fecha || '',
    data.hora || '',
    data.sucursal || '',
    data.doctor || '',
    data.asesor || '',
    data.nombre || '',
    data.genero || '',
    data.edad || '',
    data.tipo_paciente || '',
    data.tipo_cita || '',
    data.tratamiento || '',
    data.cotizacion || '',
    data.motivo || '',
    data.decision || '',
    data.alergias || '',
    data.notas || '',
    data.fuente || '',
    data.lead || '',
    'Pendiente',
    new Date()
  ]);

  return jsonOutput_({ status: 'ok', id: id });
}

function marcarAsistencia_(data) {
  const sheet = getOrCreateCitasSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonOutput_({ status: 'error', message: 'No hay citas registradas' });

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let rowIndex = -1;
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(data.id)) { rowIndex = i + 2; break; }
  }
  if (rowIndex === -1) return jsonOutput_({ status: 'error', message: 'No se encontró esa cita' });

  const estado = data.estado === 'Asistió' ? 'Asistió' : 'No asistió';
  const colEstado = CITAS_HEADERS.indexOf('Estado') + 1;
  sheet.getRange(rowIndex, colEstado).setValue(estado);

  if (estado === 'Asistió') {
    const rowVals = sheet.getRange(rowIndex, 1, 1, CITAS_HEADERS.length).getValues()[0];
    const cita = {};
    CITAS_HEADERS.forEach((h, i) => { cita[h] = rowVals[i]; });

    const asesor = cita['Asesor'];
    const origen = (asesor && asesor !== '') ? 'Por asesor' : 'Cuenta propia';

    insertarRegistro_({
      nombre: cita['Paciente'],
      clinica: cita['Sucursal'],
      asesor: asesor,
      paquete: data.paquete || 'Individual',
      origen: origen,
      fecha: cita['Fecha']
    });
  }

  return jsonOutput_({ status: 'ok' });
}

function obtenerCitas_(e) {
  const sheet = getOrCreateCitasSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonOutput_([]);

  const values = sheet.getRange(2, 1, lastRow - 1, CITAS_HEADERS.length).getValues();
  let citas = values.map(row => {
    const obj = {};
    CITAS_HEADERS.forEach((h, i) => {
      let v = row[i];
      if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      obj[h] = v;
    });
    return obj;
  }).filter(c => c['Paciente']);

  const asesorFiltro = e && e.parameter && e.parameter.asesor;
  if (asesorFiltro) citas = citas.filter(c => c['Asesor'] === asesorFiltro);

  return jsonOutput_(citas);
}

// =====================================================================
// INTEGRACIÓN ONESIGNAL - PUSH NOTIFICATIONS
// =====================================================================
const ONESIGNAL_APP_ID = "5d3771b1-d067-48fd-9bdd-581bce3dbd43";
const ONESIGNAL_REST_API_KEY = "TU_REST_API_KEY_AQUI";

function enviarNotificacionOneSignal(nombre, clinica, id) {
  if (!ONESIGNAL_REST_API_KEY || ONESIGNAL_REST_API_KEY === "TU_REST_API_KEY_AQUI") return;

   const payload = {
    app_id: ONESIGNAL_APP_ID,
    target_channel: "push",
    included_segments: ["Total Subscriptions"],
    data: { "registro_id": id },
    url: "https://miguelgalvezdentalmasfacil-netizen.github.io/Reporte-Asistencia-D-F/",
    contents: {
      en: "Nuevo paciente registrado: " + nombre + " en " + clinica,
      es: "Nuevo paciente registrado: " + nombre + " en " + clinica
    },
    headings: {
      en: "Nueva Asistencia",
      es: "Nueva Asistencia"
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": "Key " + ONESIGNAL_REST_API_KEY
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch("https://api.onesignal.com/notifications", options);
    Logger.log("Respuesta de OneSignal: " + response.getContentText());
  } catch (e) {
    console.error("Error al enviar notificación de OneSignal: " + e.toString());
  }
}
