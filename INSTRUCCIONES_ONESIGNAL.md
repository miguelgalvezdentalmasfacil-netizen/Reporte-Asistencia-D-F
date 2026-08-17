# Configuración de OneSignal para Notificaciones Push

Este repositorio ahora está preparado como PWA (Aplicación Web Progresiva) y tiene el código base para enviar notificaciones Push a tu celular (o al de los administradores) cada vez que se registra un nuevo paciente.

Para que esto funcione en la vida real, necesitas seguir estos pasos para conectar tu cuenta gratuita de OneSignal.

## PASO 1: Crear la App en OneSignal
1. Entra a [onesignal.com](https://onesignal.com/) y crea una cuenta gratuita.
2. Haz clic en **"New App/Website"**.
3. Ponle un nombre (ej. "Asistencia DMF") y elige **"Web"**.
4. En la configuración de plataforma web (Web Configuration):
   - **Site Name:** Dental Más Fácil
   - **Site URL:** `https://miguelgalvezdentalmasfacil-netizen.github.io/`
   - **Default Icon URL:** Puedes subir el logo oficial aquí.
   - **Important:** Asegúrate de habilitar que tu sitio es completamente HTTPS.

## PASO 2: Pegar el App ID en el código frontend
Al terminar de configurar en OneSignal, te darán un **App ID** (un código largo con letras y números).
Debes ir al archivo `index.html` de este repositorio, bajar casi hasta el final, y buscar esta línea:
```javascript
appId: "TU_APP_ID_AQUI", // <-- Pega aquí tu App ID de OneSignal
```
Reemplaza `"TU_APP_ID_AQUI"` con tu App ID real y guarda el archivo.

## PASO 3: Configurar el Backend (Apps Script)
Tu backend actual vive en Google Apps Script. Para que Apps Script pueda avisarle a OneSignal que envíe la notificación cada vez que guardas una fila nueva, tienes que copiar el siguiente código y pegarlo en tu proyecto de **Google Apps Script** (en `code.gs` o tu archivo principal).

```javascript
// ====== PEGA ESTO EN TU GOOGLE APPS SCRIPT ======
const ONESIGNAL_APP_ID = "TU_APP_ID_AQUI"; 
const ONESIGNAL_API_KEY = "TU_REST_API_KEY_AQUI"; // La encuentras en OneSignal > Settings > Keys & IDs

function enviarNotificacionPush(nombrePaciente, clinica) {
  if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID === "TU_APP_ID_AQUI") return;
  
  const payload = {
    app_id: ONESIGNAL_APP_ID,
    included_segments: ["Subscribed Users"], // Envía a todos los administradores que aceptaron notificaciones
    contents: {
      en: "Nuevo paciente registrado: " + nombrePaciente + " en " + clinica,
      es: "Nuevo paciente registrado: " + nombrePaciente + " en " + clinica
    },
    headings: {
      en: "Registro de Asistencia",
      es: "Registro de Asistencia"
    }
  };
  
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": "Basic " + ONESIGNAL_API_KEY
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    UrlFetchApp.fetch("https://onesignal.com/api/v1/notifications", options);
  } catch (e) {
    console.error("Error enviando push: " + e);
  }
}
// =================================================
```

### ¿Dónde llamo a esa función en Apps Script?
En tu Apps Script, debes tener una función `doPost(e)` que es la que recibe el registro de tu página. Justo después de la línea donde guardas los datos en tu Google Sheet (por ejemplo `sheet.appendRow(...)`), agrega esta llamada:

```javascript
enviarNotificacionPush(datosDelPaciente.nombre, datosDelPaciente.clinica);
```

## PASO 4: Instala la App y Acepta las notificaciones
1. Entra a tu dashboard desde el celular (Safari o Chrome).
2. Toca "Compartir > Agregar a Inicio" (en iPhone) o "Instalar Aplicación" (en Android).
3. Abre la App desde tu pantalla de inicio. OneSignal te mostrará una alerta preguntando si deseas recibir notificaciones. Acepta.
4. ¡Listo! Cada vez que alguien registre un paciente, tu Apps Script lanzará el aviso y te llegará la campanita al celular.
