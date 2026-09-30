import re

with open('citas/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the Confirmación block
confirmacion_pattern = r'<div className="panel"[^>]*>[\s]*<div className="panel-head"[^>]*>[\s]*<div className="eyebrow"[^>]*>Previsualizaci.*?</div>[\s]*<h2>Confirmación al Paciente</h2>.*?</button>[\s]*</div>'
content = re.sub(confirmacion_pattern, '', content, flags=re.DOTALL)

# Remove msgPaciente function
msg_paciente_pattern = r'const msgPaciente = \(\) => \{.*?\};\n'
content = re.sub(msg_paciente_pattern, '', content, flags=re.DOTALL)

# Remove cp2 state
content = re.sub(r'const \[cp2, setCp2\]   = useState\(false\);\n', '', content)

# Split the form panel into multiple panels
form_pattern = r'(<div className="panel">[\s]*<div className="panel-head">[\s]*<div className="eyebrow">Formulario</div>[\s]*<h2>Datos de la Cita</h2>[\s]*</div>[\s]*<div className="panel-body">.*?)(<div style=\{\{marginTop:12\}\}>[\s]*<button onClick=\{guardarCita\})'
match = re.search(form_pattern, content, flags=re.DOTALL)

if match:
    form_content = match.group(1)
    
    # We replace the hr tags with new panel boundaries
    new_form_content = form_content.replace(
        '<hr style={{border:0, borderTop:\'1px solid var(--line-soft)\', margin:\'8px 0 24px\'}} />',
        '</div></div>\n              <div className="panel">\n                <div className="panel-body" style={{paddingTop:"24px"}}>'
    )
    
    # Wrap the button inside a panel at the bottom
    content = content.replace(match.group(1), new_form_content)

with open('citas/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
