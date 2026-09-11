import os
import re
from fpdf import FPDF

class PremiumPDF(FPDF):
    def __init__(self, doc_title="Documento NexuMathEdu", author="Equipo NexuMathEdu", *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.doc_title = doc_title
        self.author_name = author
        self.set_margins(15, 20, 15)
        self.set_auto_page_break(auto=True, margin=20)
        
        # Intentar cargar fuente Arial de Windows para soporte UTF-8 completo en español
        arial_regular = r"C:\Windows\Fonts\arial.ttf"
        arial_bold = r"C:\Windows\Fonts\arialbd.ttf"
        arial_italic = r"C:\Windows\Fonts\ariali.ttf"
        arial_bi = r"C:\Windows\Fonts\arialbi.ttf"
        
        if os.path.exists(arial_regular) and os.path.exists(arial_bold):
            self.add_font("ArialCustom", "", arial_regular)
            self.add_font("ArialCustom", "B", arial_bold)
            if os.path.exists(arial_italic):
                self.add_font("ArialCustom", "I", arial_italic)
            if os.path.exists(arial_bi):
                self.add_font("ArialCustom", "BI", arial_bi)
            else:
                self.add_font("ArialCustom", "BI", arial_bold) # Fallback a negrita
            self.main_font = "ArialCustom"
        else:
            self.main_font = "helvetica"

    def header(self):
        if self.page_no() == 1:
            return  # No header on cover page
        
        # Barra superior decorativa morada
        self.set_fill_color(157, 49, 255) # #9D31FF
        self.rect(0, 0, 210, 4, 'F')
        
        # Título del documento y branding
        self.set_font(self.main_font, "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 6, "NexuMathEdu  |  Documentación Oficial", 0, 0, 'L')
        self.cell(0, 6, self.doc_title, 0, 1, 'R')
        
        # Línea divisoria sutil
        self.set_draw_color(220, 220, 220)
        self.set_line_width(0.2)
        self.line(15, 23, 195, 23)
        self.ln(5)

    def footer(self):
        if self.page_no() == 1:
            return  # No footer on cover page
            
        # Línea divisoria inferior
        self.set_draw_color(220, 220, 220)
        self.set_line_width(0.2)
        self.line(15, 280, 195, 280)
        
        self.set_y(-15)
        self.set_font(self.main_font, "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"© 2026 NexuMathEdu. Todos los derechos reservados.", 0, 0, 'L')
        self.cell(0, 10, f"Página {self.page_no()}", 0, 0, 'R')

    def draw_cover_page(self, subtitle="Manual de Usuario"):
        self.add_page()
        
        # Fondo decorativo lateral
        self.set_fill_color(157, 49, 255) # Morado principal
        self.rect(0, 0, 30, 297, 'F')
        
        # Título principal de la aplicación
        self.set_xy(45, 80)
        self.set_font(self.main_font, "B", 36)
        self.set_text_color(157, 49, 255)
        self.cell(0, 12, "NexuMathEdu", 0, 1)
        
        # Subtítulo (Manual de Usuario / Arquitectura)
        self.set_x(45)
        self.set_font(self.main_font, "B", 18)
        self.set_text_color(75, 85, 99) # Gris oscuro
        self.cell(0, 10, subtitle, 0, 1)
        
        # Barra decorativa horizontal
        self.ln(5)
        self.set_x(45)
        self.set_fill_color(75, 85, 99)
        self.rect(45, 112, 100, 2, 'F')
        
        # Detalles adicionales
        self.set_xy(45, 130)
        self.set_font(self.main_font, "", 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 6, "Plataforma de Gestión Educativa con IA", 0, 1)
        self.set_x(45)
        self.cell(0, 6, f"Autor: {self.author_name}", 0, 1)
        self.set_x(45)
        self.cell(0, 6, "Versión: 1.0.0 (Estable)", 0, 1)
        self.set_x(45)
        self.cell(0, 6, "Fecha de publicación: Junio, 2026", 0, 1)
        
        # Salto de página para el contenido
        self.add_page()

    def write_inline_styled(self, text, base_font_size=10, style='', line_height=5):
        # Reemplazar caracteres especiales de calculadora
        text = text.replace("🖩", "(Calculadora)")
        
        # Separamos por negritas
        parts = text.split('**')
        for i, part in enumerate(parts):
            is_bold = (i % 2 == 1)
            
            # Separamos por fragmentos de código inline
            subparts = part.split('`')
            for j, subpart in enumerate(subparts):
                is_code = (j % 2 == 1)
                
                if is_code:
                    self.set_font("courier", "", base_font_size - 1)
                    self.set_text_color(220, 53, 69) # Rojo suave para código
                    self.write(line_height, subpart)
                else:
                    font_style = 'B' if is_bold else style
                    self.set_font(self.main_font, font_style, base_font_size)
                    self.set_text_color(31, 41, 55) # Gris carbón
                    self.write(line_height, subpart)


def clean_markdown_text(text):
    # Eliminar enlaces de markdown tipo [texto](url) dejando solo el texto
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    # Reemplazar &nbsp; o similares si los hay
    return text.strip()


def parse_and_generate_pdf(md_filepath, pdf_filepath, doc_title, doc_subtitle):
    print(f"Procesando {md_filepath}...")
    
    with open(md_filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    pdf = PremiumPDF(doc_title=doc_title)
    pdf.draw_cover_page(subtitle=doc_subtitle)
    
    in_code_block = False
    code_lines = []
    
    in_table = False
    table_headers = []
    table_rows = []
    
    idx = 0
    while idx < len(lines):
        line = lines[idx].rstrip('\r\n')
        stripped = line.strip()
        
        # --- CODE BLOCKS ---
        if stripped.startswith("```"):
            if in_code_block:
                # Terminar bloque de código
                pdf.set_font("courier", "", 8.5)
                pdf.set_fill_color(245, 246, 247)
                pdf.set_draw_color(200, 200, 200)
                pdf.set_text_color(50, 50, 50)
                
                # Calcular altura necesaria
                width = 180
                # Limpiar caracteres de dibujo de caja de unicode para evitar errores de fuente Courier
                cleaned_code_lines = []
                for cl in code_lines:
                    cleaned_line = cl.replace("├──", "+--").replace("└──", "+--").replace("──", "--").replace("│", "|")
                    cleaned_line = cleaned_line.replace("\u251c", "+").replace("\u2514", "+").replace("\u2502", "|").replace("\u2500", "-")
                    cleaned_code_lines.append(cleaned_line)
                # Renderizar cada línea en un multi_cell
                code_text = "\n".join(cleaned_code_lines)
                pdf.multi_cell(width, 4, code_text, border=1, fill=True)
                pdf.ln(4)
                
                code_lines = []
                in_code_block = False
            else:
                in_code_block = True
            idx += 1
            continue
            
        if in_code_block:
            code_lines.append(line)
            idx += 1
            continue

        # --- TABLES ---
        if stripped.startswith("|"):
            # Es parte de una tabla
            if not in_table:
                in_table = True
                # Parsear cabecera
                cells = [clean_markdown_text(c) for c in stripped.split("|")[1:-1]]
                table_headers = cells
                # Saltar la línea de separación siguiente (ej. |---|---|)
                idx += 1
                if idx < len(lines):
                    next_line = lines[idx].strip()
                    if next_line.startswith("|") and "-" in next_line:
                        # Confirmado que es separador, lo saltamos
                        idx += 1
                continue
            else:
                cells = [clean_markdown_text(c) for c in stripped.split("|")[1:-1]]
                table_rows.append(cells)
                idx += 1
                continue
        elif in_table:
            # Terminar tabla y dibujarla
            if table_headers:
                # Calcular anchos de columna dinámicos proporcionales
                total_width = 180
                num_cols = len(table_headers)
                
                max_lengths = [len(h) for h in table_headers]
                for r in table_rows:
                    for c_idx, cell in enumerate(r):
                        if c_idx < len(max_lengths):
                            max_lengths[c_idx] = max(max_lengths[c_idx], len(cell))
                
                sum_lengths = sum(max_lengths) if sum(max_lengths) > 0 else 1
                col_widths = []
                for l in max_lengths:
                    w = (l / sum_lengths) * total_width
                    w = max(w, 15)  # Mínimo 15mm
                    col_widths.append(w)
                
                # Ajustar para que sume exactamente 180mm
                current_sum = sum(col_widths)
                col_widths = [w * (total_width / current_sum) for w in col_widths]
                
                # Comprobar si la cabecera cabe en la página actual
                max_h = 7
                if pdf.get_y() + max_h > 277:
                    pdf.add_page()
                
                # Dibujar Cabecera
                pdf.set_font(pdf.main_font, "B", 9)
                pdf.set_fill_color(157, 49, 255) # Morado principal
                pdf.set_text_color(255, 255, 255)
                pdf.set_draw_color(220, 220, 220)
                pdf.set_line_width(0.2)
                
                pdf.set_auto_page_break(auto=False)
                x_pos = pdf.get_x()
                y_before = pdf.get_y()
                for c_idx, header_text in enumerate(table_headers):
                    pdf.set_xy(x_pos, y_before)
                    pdf.rect(x_pos, y_before, col_widths[c_idx], max_h, 'FD')
                    pdf.multi_cell(col_widths[c_idx], max_h, header_text, border=0, align='C')
                    x_pos += col_widths[c_idx]
                pdf.set_auto_page_break(auto=True, margin=20)
                pdf.set_xy(15, y_before + max_h)
                
                # Dibujar Filas
                pdf.set_font(pdf.main_font, "", 8.5)
                pdf.set_text_color(31, 41, 55)
                pdf.set_draw_color(220, 220, 220)
                
                for r_idx, row in enumerate(table_rows):
                    # Zebra striping (filas alternas)
                    if r_idx % 2 == 1:
                        pdf.set_fill_color(248, 249, 250)
                    else:
                        pdf.set_fill_color(255, 255, 255)
                        
                    # Calcular altura requerida para la fila
                    max_row_h = 6
                    for c_idx, cell_text in enumerate(row):
                        if c_idx < len(col_widths):
                            text_w = pdf.get_string_width(cell_text)
                            nb = int(text_w / (col_widths[c_idx] - 2)) + 1
                            nb = max(nb, cell_text.count('\n') + 1)
                            h = nb * 4.5 + 2
                            if h > max_row_h:
                                max_row_h = h
                                
                    # Comprobar si el renglón cabe en la página actual
                    if pdf.get_y() + max_row_h > 277:
                        pdf.add_page()
                        
                    y_before = pdf.get_y()
                    x_pos = pdf.get_x()
                    
                    # Deshabilitar auto page break para evitar saltos indeseados a mitad del renglón
                    pdf.set_auto_page_break(auto=False)
                    
                    # 1. Pintar fondos y bordes de las celdas
                    for c_idx, cell_text in enumerate(row):
                        if c_idx < len(col_widths):
                            pdf.rect(x_pos, y_before, col_widths[c_idx], max_row_h, 'FD')
                            x_pos += col_widths[c_idx]
                            
                    # 2. Pintar los textos correspondientes
                    x_pos = pdf.get_x()
                    for c_idx, cell_text in enumerate(row):
                        if c_idx < len(col_widths):
                            pdf.set_xy(x_pos, y_before + 1)
                            pdf.multi_cell(col_widths[c_idx], 4.2, cell_text, border=0, fill=False, align='L')
                            x_pos += col_widths[c_idx]
                            
                    # Restaurar auto page break
                    pdf.set_auto_page_break(auto=True, margin=20)
                    pdf.set_xy(15, y_before + max_row_h)
                
                pdf.ln(5)
            
            # Limpiar estado de la tabla
            in_table = False
            table_headers = []
            table_rows = []
            # Continuar procesando la línea actual
        
        # Saltar líneas vacías
        if not stripped:
            pdf.ln(3)
            idx += 1
            continue

        # --- HEADINGS ---
        if stripped.startswith("# "):
            title_text = clean_markdown_text(stripped[2:])
            # Saltar el título principal si ya está en la portada
            if title_text.lower() in [doc_title.lower(), doc_subtitle.lower()]:
                idx += 1
                continue
            pdf.set_font(pdf.main_font, "B", 20)
            pdf.set_text_color(157, 49, 255)
            pdf.cell(0, 10, title_text, 0, 1)
            pdf.ln(2)
            
        elif stripped.startswith("## "):
            h1_text = clean_markdown_text(stripped[3:])
            # Salto de página preventivo si estamos muy abajo
            if pdf.get_y() > 240:
                pdf.add_page()
            
            # Dibujar un rectángulo decorativo en el borde izquierdo
            y = pdf.get_y()
            pdf.set_fill_color(157, 49, 255)
            pdf.rect(15, y + 1, 3, 6, 'F')
            
            pdf.set_font(pdf.main_font, "B", 14)
            pdf.set_text_color(157, 49, 255)
            pdf.set_x(21)
            pdf.cell(0, 8, h1_text, 0, 1)
            pdf.ln(2)
            
        elif stripped.startswith("### "):
            h2_text = clean_markdown_text(stripped[4:])
            pdf.set_font(pdf.main_font, "B", 11.5)
            pdf.set_text_color(75, 85, 99)
            pdf.cell(0, 7, h2_text, 0, 1)
            pdf.ln(1)
            
        elif stripped.startswith("#### "):
            h3_text = clean_markdown_text(stripped[5:])
            pdf.set_font(pdf.main_font, "BI", 10.5)
            pdf.set_text_color(31, 41, 55)
            pdf.cell(0, 6, h3_text, 0, 1)
            pdf.ln(1)

        # --- HORIZONTAL RULES ---
        elif stripped == "---":
            pdf.ln(2)
            pdf.set_draw_color(220, 220, 220)
            pdf.set_line_width(0.3)
            pdf.line(15, pdf.get_y(), 195, pdf.get_y())
            pdf.ln(4)

        # --- BLOCKQUOTES ---
        elif stripped.startswith(">"):
            quote_text = clean_markdown_text(stripped[1:])
            pdf.set_fill_color(248, 249, 250)
            pdf.set_draw_color(157, 49, 255) # Borde izquierdo morado
            pdf.set_line_width(1.0)
            
            # Guardamos posición antes de multi_cell
            x = pdf.get_x()
            y = pdf.get_y()
            
            pdf.set_x(20)
            pdf.set_font(pdf.main_font, "I", 9.5)
            pdf.set_text_color(100, 100, 100)
            
            # Imprimir texto
            pdf.multi_cell(175, 5, quote_text, border=0, fill=True)
            y_end = pdf.get_y()
            
            # Dibujar la línea de blockquote
            pdf.line(18, y, 18, y_end)
            pdf.set_xy(15, y_end)
            pdf.ln(3)

        # --- LISTS ---
        elif stripped.startswith("- ") or stripped.startswith("* "):
            list_text = clean_markdown_text(stripped[2:])
            pdf.set_x(20)
            pdf.set_font(pdf.main_font, "B", 10)
            pdf.set_text_color(157, 49, 255)
            pdf.write(5, "•  ")
            
            pdf.write_inline_styled(list_text, base_font_size=9.5)
            pdf.ln(5.5)
            
        elif re.match(r'^\d+\.\s', stripped):
            match = re.match(r'^(\d+)\.\s(.*)', stripped)
            num = match.group(1)
            list_text = clean_markdown_text(match.group(2))
            
            pdf.set_x(20)
            pdf.set_font(pdf.main_font, "B", 9.5)
            pdf.set_text_color(157, 49, 255)
            pdf.write(5, f"{num}.  ")
            
            pdf.write_inline_styled(list_text, base_font_size=9.5)
            pdf.ln(5.5)

        # --- NORMAL PARAGRAPHS ---
        else:
            para_text = clean_markdown_text(line)
            pdf.set_font(pdf.main_font, "", 10)
            pdf.write_inline_styled(para_text, base_font_size=10, line_height=5)
            pdf.ln(5.5)

        idx += 1
        
    # Guardar documento
    os.makedirs(os.path.dirname(pdf_filepath), exist_ok=True)
    pdf.output(pdf_filepath)
    print(f"¡PDF guardado con éxito en {pdf_filepath}!")


if __name__ == "__main__":
    docs_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Mapeo de archivos markdown a PDF
    documents = [
        {
            "md": os.path.join(docs_dir, "manual-admin.md"),
            "pdf": os.path.join(docs_dir, "manual-admin.pdf"),
            "title": "Manual del Administrador",
            "subtitle": "Guía de Usuario — Rol Administrador"
        },
        {
            "md": os.path.join(docs_dir, "manual-profesor.md"),
            "pdf": os.path.join(docs_dir, "manual-profesor.pdf"),
            "title": "Manual del Profesor",
            "subtitle": "Guía de Usuario — Rol Profesor"
        },
        {
            "md": os.path.join(docs_dir, "manual-estudiante.md"),
            "pdf": os.path.join(docs_dir, "manual-estudiante.pdf"),
            "title": "Manual del Estudiante",
            "subtitle": "Guía de Usuario — Rol Estudiante"
        },
        {
            "md": os.path.join(docs_dir, "rutas-contexto-ia.md"),
            "pdf": os.path.join(docs_dir, "arquitectura-y-rutas.pdf"),
            "title": "Arquitectura y Rutas",
            "subtitle": "Documentación Técnica del Sistema"
        }
    ]
    
    for doc in documents:
        if os.path.exists(doc["md"]):
            try:
                parse_and_generate_pdf(doc["md"], doc["pdf"], doc["title"], doc["subtitle"])
            except Exception as e:
                print(f"Error procesando {doc['md']}: {e}")
        else:
            print(f"Advertencia: No se encontró el archivo {doc['md']}")
