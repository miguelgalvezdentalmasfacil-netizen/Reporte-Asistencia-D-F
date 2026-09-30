const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Add 'Otro' to the asesor select
html = html.replace(
  '<option value="Edgar">Edgar</option>',
  '<option value="Edgar">Edgar</option>\n              <option value="Otro">Otro...</option>'
);

// 2. Add an input for 'Otro' right after the select
const fieldAsesorEnd = '</select>\n            </div>';
html = html.replace(
  fieldAsesorEnd,
  '</select>\n              <input type="text" id="asesorOtro" placeholder="Escribe el nombre del asesor" style="display:none; margin-top:8px; width:100%; padding:12px 14px; border:1px solid var(--line); border-radius:9px; font-family:\\\'Inter\\\',sans-serif; font-size:16px; color:var(--ink); background:var(--paper); outline:none;" autocomplete="off">\n            </div>'
);

// 3. Add 'Doctoralia' to the origen chips
html = html.replace(
  '<div class="chip sel-origen" data-val="Convenio">Convenio</div>',
  '<div class="chip sel-origen" data-val="Convenio">Convenio</div>\n              <div class="chip sel-origen" data-val="Doctoralia">Doctoralia</div>'
);

// 4. Update the logic for finalOrigen and asesor in the regForm submit handler
const getAsesorMatch = "const asesor = document.getElementById('asesor').value;";
const getAsesorReplace = `let asesor = document.getElementById('asesor').value;
  if (asesor === 'Otro') {
    asesor = document.getElementById('asesorOtro').value.trim();
    if(!asesor) {
      errorEl.textContent = 'Escribe el nombre del asesor';
      errorEl.style.display = 'block';
      return;
    }
  }`;

html = html.replace(getAsesorMatch, getAsesorReplace);

const origenMatch = `  let finalOrigen = asesor ? "Por asesor" : "Cuenta propia";
  if (selOrigen.includes("Convenio")) {
    finalOrigen += ", Convenio";
  }`;

const origenReplace = `  let finalOrigen = asesor ? "Por asesor" : "Cuenta propia";
  if (selOrigen.includes("Convenio")) {
    finalOrigen += ", Convenio";
  }
  if (selOrigen.includes("Doctoralia")) {
    finalOrigen += ", Doctoralia";
  }`;

html = html.replace(origenMatch, origenReplace);

// 5. Add event listener to toggle the 'asesorOtro' input visibility
const initScriptMatch = "const tabCitas = document.getElementById('tabCitas');";
const initScriptReplace = `const tabCitas = document.getElementById('tabCitas');
  
document.getElementById('asesor').addEventListener('change', (e) => {
  const inputOtro = document.getElementById('asesorOtro');
  if (e.target.value === 'Otro') {
    inputOtro.style.display = 'block';
    inputOtro.focus();
  } else {
    inputOtro.style.display = 'none';
    inputOtro.value = '';
  }
});`;

html = html.replace(initScriptMatch, initScriptReplace);

// 6. Reset the 'asesorOtro' input when form resets
const resetMatch = "document.getElementById('regForm').reset();";
const resetReplace = `document.getElementById('regForm').reset();
  document.getElementById('asesorOtro').style.display = 'none';
  document.getElementById('asesorOtro').value = '';`;

html = html.replace(resetMatch, resetReplace);

fs.writeFileSync('index.html', html, 'utf8');
console.log('index.html updated successfully');
