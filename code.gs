const SPREADSHEET_ID = '1d_dHEGErqZ_oSjGn6DM1Ucsam_EQEKSh5FeqXr526TE';
const SHEET_NAME = 'Bitácora de Folios';
const UPLOADS_FOLDER_NAME = 'Solicitudes de Compra - Adjuntos';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error('No se encontró la hoja "' + SHEET_NAME + '"');
    }

    const folder = getUploadsFolder_();
    const nextFolio = getNextFolio_(sheet);
    const fechaSolicitud = new Date();

    const cotizacionLink = data.cotizacion ? saveFileToDrive_(data.cotizacion, folder, nextFolio) : '';
    const facturaLink = data.factura ? saveFileToDrive_(data.factura, folder, nextFolio) : '';
    const articuloLinks = (data.articulo || [])
      .map(function (f) { return saveFileToDrive_(f, folder, nextFolio); })
      .join(', ');

    const row = [
      nextFolio,
      fechaSolicitud,
      data.email || '',
      data.sucursal || '',
      data.solicitante || '',
      data.puesto || '',
      data.urgencia || '',
      articuloLinks,
      data.motivo || '',
      cotizacionLink,
      data.proveedor || '',
      facturaLink,
      '',
      'Pendiente',
      '',
      '',
      '',
      '',
      ''
    ];

    sheet.appendRow(row);

    return jsonResponse_({ success: true, folio: nextFolio });

  } catch (err) {
    return jsonResponse_({ success: false, error: err.message });
  }
}

function doGet(e) {
  return jsonResponse_({ status: 'ok' });
}

function saveFileToDrive_(fileObj, folder, folio) {
  if (!fileObj || !fileObj.base64) return '';

  const bytes = Utilities.base64Decode(fileObj.base64);
  const safeName = 'Folio ' + folio + ' - ' + (fileObj.name || 'archivo');
  const blob = Utilities.newBlob(bytes, fileObj.mimeType || 'application/octet-stream', safeName);

  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return 'https://drive.google.com/open?id=' + file.getId();
}

function getUploadsFolder_() {
  const folders = DriveApp.getFoldersByName(UPLOADS_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(UPLOADS_FOLDER_NAME);
}

function getNextFolio_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let max = 0;
  values.forEach(function (r) {
    const v = Number(r[0]);
    if (!isNaN(v) && v > max) max = v;
  });
  return max + 1;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
