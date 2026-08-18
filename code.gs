/**
 * REGISTRO DE ASISTENCIA — Dental Más Fácil
 * Backend de Google Apps Script
 */

const SHEET_NAME = 'Registros';
const HEADERS = ['ID', 'Fecha asistencia', 'Paciente', 'Clínica', 'Asesor', 'Paquete', 'Origen', 'Registrado el'];

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
    .map(row => ({
      id: row[0],
      nombre: row[2],
      fecha: row[1] instanceof Date ? row[1] : new Date(row[1]),
      clinica: row[3],
      asesor: row[4] || 'Sin asignar',
      paquete: row[5],
      origen: row[6]
    }));
}

function escribirBloque_(sheet, colStart, tituloCount, filas) {
  sheet.getRange(1, colStart + 3)
    .setValue(tituloCount)
    .setBackground('#34A853')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

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
  const porAsesor = {};
  registros.forEach(r => {
    if (!porAsesor[r.asesor]) porAsesor[r.asesor] = [];
    porAsesor[r.asesor].push(r);
  });

  const asesores = Object.keys(porAsesor).sort();
  const BLOCK_COLS = 4;
  const GAP = 1;
  let colStart = 1;

  asesores.forEach(asesor => {
    const grupo = porAsesor[asesor].sort((a, b) => a.fecha - b.fecha);
    const filas = grupo.map(r => [r.nombre, r.fecha, CLINICA_CORTA[r.clinica] || r.clinica, asesor.toUpperCase()]);
    escribirBloque_(sheet, colStart, grupo.length, filas);
    colStart += BLOCK_COLS + GAP;
  });

  sheet.setFrozenRows(2);
}

function escribirBloqueClinica_(sheet, colStart, clinicaNombre, tituloCount, filas, header3) {
  sheet.getRange(1, colStart, 1, 2).merge().setValue(clinicaNombre)
    .setFontWeight('bold').setFontSize(9).setHorizontalAlignment('left').setFontColor('#5E7975');

  sheet.getRange(1, colStart + 2)
    .setValue(tituloCount)
    .setBackground('#34A853')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

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
  const porClinica = {};
  registros.forEach(r => {
    const clave = CLINICA_CORTA[r.clinica] || r.clinica;
    if (!porClinica[clave]) porClinica[clave] = [];
    porClinica[clave].push(r);
  });

  const clinicasOrdenadas = Object.keys(porClinica).sort();
  const BLOCK_COLS = 3;
  const GAP = 1;
  let colStart = 1;
  const header3 = origen === 'Cuenta propia' ? 'CLÍNICA' : 'ORIGEN';

  clinicasOrdenadas.forEach(clinica => {
    const grupo = porClinica[clinica].sort((a, b) => a.fecha - b.fecha);
    const filas = grupo.map(r => {
      const tieneAsesor = r.asesor && r.asesor !== 'Sin asignar' && r.asesor !== '—';
      const valorCol3 = origen === 'Cuenta propia'
        ? clinica
        : (tieneAsesor ? 'Asesor: ' + r.asesor.toUpperCase() : 'Cuenta propia (clínica)');
      return [r.nombre, r.fecha, valorCol3];
    });
    escribirBloqueClinica_(sheet, colStart, clinica, grupo.length, filas, header3);
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
    return crearRegistro_(data);
  } catch (err) {
    return jsonOutput_({ status: 'error', message: err.message });
  }
}

function crearRegistro_(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const id = data.id || Date.now();

  // 1. PRIMERO dispara la notificación a tu celular (inmediato)
  enviarNotificacionOneSignal(data.nombre || 'Paciente', data.clinica || 'Clínica no especificada');

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

  return jsonOutput_({ status: 'ok', id: id });
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

// =====================================================================
// INTEGRACIÓN ONESIGNAL - PUSH NOTIFICATIONS
// =====================================================================
const ONESIGNAL_APP_ID = "5d3771b1-d067-48fd-9bdd-581bce3dbd43";
const ONESIGNAL_REST_API_KEY = "TU_REST_API_KEY_AQUI";

function enviarNotificacionOneSignal(nombre, clinica) {
  if (!ONESIGNAL_REST_API_KEY || ONESIGNAL_REST_API_KEY === "TU_REST_API_KEY_AQUI") return;

   const payload = {
    app_id: ONESIGNAL_APP_ID,
    target_channel: "push",
    included_segments: ["Total Subscriptions"],
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
