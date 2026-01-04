import flet as ft
import base64
import io
import datetime
import numpy as np
import matplotlib
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.ticker import FuncFormatter
from reportlab.lib.pagesizes import A4
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from PIL import Image as PILImage

# Configuração essencial para evitar erros de GUI
matplotlib.use('Agg')

# Variável global para guardar o PDF gerado
pdf_b64_global = ""

def main(page: ft.Page):
    page.title = "Gerador Testo Web"
    page.scroll = "adaptive"
    page.theme_mode = ft.ThemeMode.LIGHT
    page.window_width = 400 
    
    # --- Lógica de Geração do PDF (Motor do App) ---
    def gerar_pdf_bytes(params):
        buffer_pdf = io.BytesIO()
        FOOTER_TEXT = "TESTO 174H Termistor NTC - Série 85327157"
        logo_path = "assets/testo-be-sure-logo-claim.webp"

        def _fmt_decimal(v, casas=1):
            try: return f"{float(str(v).replace(',','.')):.{casas}f}".replace('.',',')
            except: return str(v)
        def _to_float(s): return float(str(s).replace(',','.'))

        # Dados
        nome_relatorio = str(params['nome'])
        objetivo_texto = str(params['objetivo'])
        data_str = str(params['data']).strip()
        inicio_str = str(params['inicio']).strip()
        fim_str = str(params['fim']).strip()
        Ti_f = _to_float(params['Ti']); Tf_f = _to_float(params['Tf'])
        URi_f = _to_float(params['UR_ini']); URf_f = _to_float(params['UR_fim'])
        produto_str = str(params['produto'])
        timestamp_fixo = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")

        # Cálculos Matemáticos
        data_dt = datetime.datetime.strptime(data_str, "%d/%m/%Y")
        inicio_dt = datetime.datetime.combine(data_dt.date(), datetime.datetime.strptime(inicio_str, "%H:%M").time())
        fim_dt = datetime.datetime.combine(data_dt.date(), datetime.datetime.strptime(fim_str, "%H:%M").time())
        if fim_dt < inicio_dt: fim_dt += datetime.timedelta(days=1)
        minutos = max(1, int((fim_dt - inicio_dt).total_seconds() // 60))
        taxa = (Ti_f - Tf_f)/minutos
        tempos = [inicio_dt + datetime.timedelta(minutes=i) for i in range(minutos+1)]
        T_linear = np.array([Ti_f - taxa*i for i in range(minutos+1)], dtype=float)
        T_linear[-1] = Tf_f
        T_disp = np.round(T_linear,1); T_disp[0]=Ti_f; T_disp[-1]=Tf_f
        UR = URi_f + (URf_f-URi_f)*np.linspace(0,1,minutos+1)
        UR = np.round(UR,1); UR[0]=URi_f; UR[-1]=URf_f
        Tamb=0.0
        k_list=[0.0]
        for i in range(minutos):
            a=T_linear[i]-Tamb; b=T_linear[i+1]-Tamb
            k_list.append(0.0 if a<=0 or b<=0 else -np.log(b/a))
        k_global = -np.log((Tf_f-Tamb)/(Ti_f-Tamb))/minutos

        # Gráfico
        fig, ax1 = plt.subplots(figsize=(9.2,5.4))
        n_fino=10
        tempos_fino=[inicio_dt+datetime.timedelta(minutes=float(i)/n_fino) for i in range(minutos*n_fino+1)]
        t_fino=np.linspace(0,minutos,minutos*n_fino+1)
        T_exp = Tamb + (Ti_f-Tamb)*np.exp(-k_global*t_fino)
        ax1.plot(tempos_fino, T_exp, linestyle='-', label=f"K constante de resfriamento (k={k_global:.3f} min⁻¹)")
        ax1.plot(tempos, T_disp, marker='o', linestyle='none', label="ºC evolução do resfriamento")
        
        def _ticks(s,e,max_ticks=10,min_ticks=6):
            tot=int((e-s).total_seconds()//60); n=int(round(tot/8))+2; n=max(min_ticks,min(max_ticks,n))
            mins=sorted(set([0,tot]+[int(round(i*tot/(n-1))) for i in range(n)]))
            if len(mins)>max_ticks:
                step=int(np.ceil(len(mins)/max_ticks)); mins=mins[::step]
                if mins[0]!=0: mins=[0]+[m for m in mins if m!=0]
                if mins[-1]!=tot: mins=[m for m in mins if m!=tot]+[tot]
            return [s+datetime.timedelta(minutes=m) for m in mins]
            
        ax1.set_xticks(_ticks(inicio_dt, fim_dt))
        ax1.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))
        ax1.set_xlabel("Tempo (hh:mm)"); ax1.set_ylabel("Temperatura (°C)"); ax1.grid(True); plt.setp(ax1.get_xticklabels(), rotation=0, ha="center")
        ax2=ax1.twinx(); ax2.plot(tempos, UR, marker='x', linestyle='--', label="UR [%Hr]"); ax2.set_ylabel("Umidade Relativa (%Hr)")
        y0,y1=ax2.get_ylim(); ax2.set_ylim(max(0,y0),y1); ax2.yaxis.set_major_formatter(FuncFormatter(lambda y,_: f"{abs(y):.1f}".replace('.',',')))
        lines1,labels1=ax1.get_legend_handles_labels(); lines2,labels2=ax2.get_legend_handles_labels()
        ax1.legend(lines1+lines2, labels1+labels2, loc="upper right", fontsize=9)
        plt.title(f"Validação de Resfriamento - {data_str}\nTabela linear; k por minuto; curva exponencial (Newton)")
        plt.tight_layout()
        
        buffer_chart = io.BytesIO()
        plt.savefig(buffer_chart, format='png')
        plt.close()
        buffer_chart.seek(0)

        # Layout PDF
        PAGE_W,PAGE_H=A4; left_margin=right_margin=72; base_top_margin=72.0; gap_below_logo=8.0
        logo_w=70.0; logo_h=16.0
        
        try:
            with PILImage.open(logo_path) as im:
                w,h=im.size; ratio=h/float(w) if w else 0.25
                logo_h=max(16.0, logo_w*ratio)
        except: pass 
            
        top_margin = base_top_margin + logo_h + gap_below_logo
        bottom_margin = 50

        styles=getSampleStyleSheet()
        style_title=ParagraphStyle("title", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=12, leading=14, alignment=1)
        style_l=ParagraphStyle("valL", parent=styles["Normal"], fontName="Helvetica", fontSize=9, leading=11, alignment=0)
        style_c=ParagraphStyle("valC", parent=styles["Normal"], fontName="Helvetica", fontSize=9, leading=11, alignment=1)
        style_obs=ParagraphStyle("obsC", parent=styles["Normal"], fontName="Helvetica-Oblique", fontSize=9, leading=12, alignment=1)

        class NumberedCanvas(canvas.Canvas):
            def __init__(self,*a,**kw):
                super().__init__(*a,**kw); self._saved_page_states=[]
            def showPage(self):
                self._saved_page_states.append(dict(self.__dict__)); super().showPage()
            def save(self):
                self._saved_page_states.append(dict(self.__dict__))
                total=len(self._saved_page_states)
                for state in self._saved_page_states:
                    self.__dict__.update(state)
                    x_right = PAGE_W - right_margin
                    y_footer = 36
                    self.saveState()
                    self.setFont("Helvetica",9)
                    self.drawRightString(x_right, y_footer + 2, f"{self._pageNumber} de {total}")
                    self.setFont("Helvetica-Oblique",8)
                    self.drawRightString(x_right, y_footer - 10, FOOTER_TEXT)
                    self.restoreState()
                    super().showPage()
                super().save()

        def on_page(c, doc):
            try:
                y = PAGE_H - base_top_margin - logo_h
                c.drawImage(logo_path, left_margin, y, width=logo_w, height=logo_h, preserveAspectRatio=True, mask='auto')
            except: pass
            y_logo_top = PAGE_H - base_top_margin; y_logo_bottom = PAGE_H - top_margin; y_center=(y_logo_top+y_logo_bottom)/2.0
            x_right = PAGE_W - right_margin
            c.setFont("Helvetica",9); c.drawRightString(x_right, y_center + 6, timestamp_fixo)
            c.setFont("Helvetica-Oblique",8); c.drawRightString(x_right, 24, FOOTER_TEXT)

        doc=BaseDocTemplate(buffer_pdf, pagesize=A4, leftMargin=left_margin, rightMargin=right_margin, topMargin=top_margin, bottomMargin=bottom_margin, canvasmaker=NumberedCanvas)
        frame=Frame(left_margin, bottom_margin, PAGE_W-left_margin-right_margin, PAGE_H-top_margin-bottom_margin, id="f1")
        doc.addPageTemplates([PageTemplate(id="pt", frames=[frame], onPage=on_page)])

        cab_colwidths=[210,210]
        linha_titulo=[Paragraph(nome_relatorio, style_title),""]
        linha_obj=[Paragraph(objetivo_texto, style_l),""]
        info_txt=f"<b>Data:</b> {data_str}  •  <b>Início:</b> {inicio_str}  •  <b>Fim:</b> {fim_str}  •  <b>Intervalo (min):</b> {minutos}"
        linha_info=[Paragraph(info_txt, style_l), Paragraph(f"<b>Produto:</b> {produto_str}", style_l)]
        temp_block=f"<b>Temperatura (Máx/Mín/Méd)</b><br/>{_fmt_decimal(Ti_f,1)} ºC / {_fmt_decimal(Tf_f,1)} ºC / {_fmt_decimal((Ti_f+Tf_f)/2,1)} ºC"
        ur_block=f"<b>UR [%Hr] (Máx/Mín/Méd)</b><br/>{_fmt_decimal(UR.max(),1)} / {_fmt_decimal(UR.min(),1)} / {_fmt_decimal(UR.mean(),1)}"
        taxa_block=f"<b>Taxa média de resfriamento</b><br/>{_fmt_decimal(taxa,5)} ºC/min"
        k_block=f"<b>K constante (global)</b><br/>{_fmt_decimal(k_global,4)} min<super>-1</super>"
        cab=[linha_titulo, linha_obj, linha_info, [Paragraph(temp_block, style_l), Paragraph(ur_block, style_l)],[Paragraph(taxa_block, style_l), Paragraph(k_block, style_l)]]
        cab_table=Table(cab, colWidths=cab_colwidths, hAlign="CENTER")
        cab_table.setStyle(TableStyle([("GRID",(0,0),(-1,-1),0.6,colors.black),("BACKGROUND",(0,0),(-1,0),colors.lightgrey),("BACKGROUND",(0,1),(-1,1),colors.whitesmoke),("VALIGN",(0,0),(-1,-1),"TOP"),("SPAN",(0,0),(1,0)),("SPAN",(0,1),(1,1)),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),("FONTSIZE",(0,0),(-1,-1),9)]))
        story=[cab_table, Spacer(1,10)]
        story.append(RLImage(buffer_chart, width=420, height=260))
        story.append(Spacer(1,8))

        header=[Paragraph("ID",style_c:=style_c), Paragraph("Data/Hora",style_c), Paragraph("Temperatura [°C]",style_c), Paragraph("UR [%Hr]",style_c), Paragraph("k (min<super>-1</super>)",style_c)]
        rows=[header]
        sec=30 
        for i,t in enumerate(tempos, start=1):
            rows.append([Paragraph(str(i),style_c),Paragraph(t.replace(second=sec).strftime("%d/%m/%Y %H:%M:%S"),style_c),Paragraph(_fmt_decimal(T_disp[i-1],1),style_c),Paragraph(_fmt_decimal(UR[i-1],1),style_c),Paragraph(_fmt_decimal(k_list[i-1],4),style_c)])
        data_table=Table(rows, repeatRows=1, colWidths=[36,138,90,112,54], hAlign="CENTER")
        data_table.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.lightgrey),("TEXTCOLOR",(0,0),(-1,0),colors.black),("ALIGN",(0,1),(-1,-1),"CENTER"),("GRID",(0,0),(-1,-1),0.25,colors.black),("FONTSIZE",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,0),8),("VALIGN",(0,0),(-1,-1),"MIDDLE")]))
        story.append(data_table)
        obs=f"Registro iniciado manual às {inicio_dt.replace(second=sec).strftime('%H:%M:%S')}; fim ao atingir {_fmt_decimal(Tf_f,1)} ºC às {fim_dt.replace(second=sec).strftime('%H:%M:%S')}."
        story.append(Spacer(1,8)); story.append(Paragraph(obs, style_obs))
        doc.build(story)
        buffer_pdf.seek(0)
        return buffer_pdf.getvalue()

    # --- Elementos da UI ---
    txt_nome = ft.TextField(label="Nome do Relatório", value="MONITORAMENTO PCC 2B NA CÂMARA 0 ºC DO SETOR PRODUTIVO DO IQF", text_size=12)
    txt_objetivo = ft.TextField(label="Objetivo", value="Verificação da capacidade do atendimento do binômio 4 ºC em 4 Horas", text_size=12)
    txt_data = ft.TextField(label="Data", value=datetime.datetime.now().strftime("%d/%m/%Y"), width=160)
    txt_inicio = ft.TextField(label="Início", value="16:03", width=100)
    txt_fim = ft.TextField(label="Fim", value="16:53", width=100)
    txt_produto = ft.TextField(label="Produto", value="Sassami")
    txt_ti = ft.TextField(label="T. Ini", value="5.5", width=80)
    txt_tf = ft.TextField(label="T. Fim", value="3.2", width=80)
    txt_uri = ft.TextField(label="UR Ini", value="73,8", width=80)
    txt_urf = ft.TextField(label="UR Fim", value="89,5", width=80)
    
    lbl_status = ft.Text("")
    
    # Botão de download (Começa invisível)
    btn_download = ft.ElevatedButton("💾 SALVAR ARQUIVO", visible=False, bgcolor="green", color="white", height=60, width=300)

    # 1. Botão GERAR: Cria o PDF na memória
    def btn_gerar_click(e):
        try:
            lbl_status.value = "Gerando... Aguarde."
            lbl_status.color = "black"
            btn_download.visible = False
            page.update()
            
            params = {
                "nome": txt_nome.value, "objetivo": txt_objetivo.value,
                "data": txt_data.value, "inicio": txt_inicio.value, "fim": txt_fim.value,
                "produto": txt_produto.value, "Ti": txt_ti.value, "Tf": txt_tf.value,
                "UR_ini": txt_uri.value, "UR_fim": txt_urf.value
            }
            
            pdf_bytes = gerar_pdf_bytes(params)
            
            # Guarda o PDF na variável global em Base64
            global pdf_b64_global
            pdf_b64_global = base64.b64encode(pdf_bytes).decode()
            
            lbl_status.value = "Relatório pronto! Clique abaixo para salvar."
            lbl_status.color = "green"
            
            # Revela o botão de download
            btn_download.visible = True
            page.update()

        except Exception as ex:
            lbl_status.value = f"Erro: {ex}"
            lbl_status.color = "red"
            page.update()

    # 2. Botão BAIXAR: Usa JavaScript para forçar o Download (Infalível)
    def btn_baixar_click(e):
        global pdf_b64_global
        nome_arq = f"Relatorio_Testo_{datetime.datetime.now().strftime('%H%M%S')}.pdf"
        
        # Truque de Mágica: Cria um link HTML invisível e clica nele via JS
        js_code = f"""
        var link = document.createElement('a');
        link.href = "data:application/pdf;base64,{pdf_b64_global}";
        link.download = "{nome_arq}";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        """
        page.run_js(js_code)

    # Conecta a função ao botão de download
    btn_download.on_click = btn_baixar_click

    page.add(
        ft.Column([
            ft.Text("Gerador Testo Web", size=20, weight="bold"),
            txt_nome,
            txt_objetivo,
            ft.Row([txt_data, txt_inicio, txt_fim], wrap=True),
            txt_produto,
            ft.Divider(),
            ft.Text("Temperaturas e UR", weight="bold"),
            ft.Row([txt_ti, txt_tf, txt_uri, txt_urf], wrap=True),
            ft.Container(height=20),
            
            # Botão 1: Gerar
            ft.ElevatedButton("GERAR RELATÓRIO", on_click=btn_gerar_click, height=60, width=300, bgcolor="blue", color="white"),
            
            lbl_status,
            
            # Botão 2: Baixar (Aparece depois)
            btn_download,
            
            ft.Container(height=50)
        ], scroll="auto")
    )

ft.app(target=main)
