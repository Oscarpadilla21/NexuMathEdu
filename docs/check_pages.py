import os
from pypdf import PdfReader

def check_pdf(filepath):
    if not os.path.exists(filepath):
        print(f"El archivo {filepath} no existe.")
        return
        
    print(f"\n=== Inspeccionando: {os.path.basename(filepath)} ===")
    reader = PdfReader(filepath)
    num_pages = len(reader.pages)
    print(f"Total de páginas: {num_pages}")
    
    for idx, page in enumerate(reader.pages):
        text = page.extract_text()
        char_count = len(text.strip())
        print(f"  Página {idx + 1}: {char_count} caracteres.")
        if char_count < 10:
            print("    ⚠️ ADVERTENCIA: Esta página parece estar vacía.")

if __name__ == "__main__":
    docs_dir = os.path.dirname(os.path.abspath(__file__))
    files = ["manual-admin.pdf", "manual-profesor.pdf", "manual-estudiante.pdf", "arquitectura-y-rutas.pdf"]
    for f in files:
        check_pdf(os.path.join(docs_dir, f))
