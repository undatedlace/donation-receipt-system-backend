#!/usr/bin/env python3
"""
SDI Education Center — PDF Receipt Generator (v17 — fully dynamic)
Every section flows based on actual content height.
Nothing is hardcoded except the page footer band (which is always fixed).
"""
import sys, os, json
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

BASE   = os.path.dirname(os.path.abspath(__file__))
FONTS  = os.path.join(BASE, 'fonts')
ASSETS = os.path.join(BASE, 'assets')
K      = 0.5523


def register_fonts():
    for name, fname in [
        ('Garet-Bold','Garet-Bold.ttf'),
        ('Garet-Regular','Garet-Regular.ttf'),
        ('Garet-RegularItalic','Garet-RegularItalic.ttf'),
        ('Garet-BoldItalic','Garet-BoldItalic.ttf'),
        ('Agrandir-WideBold','Agrandir-WideBold.ttf'),
        ('Agrandir-WideHeavy','Agrandir-WideHeavy.ttf'),
        ('NotoSans-Bold','NotoSans-Bold.ttf'),
    ]:
        p = os.path.join(FONTS, fname)
        if not os.path.exists(p): raise FileNotFoundError(f'Font missing: {p}')
        pdfmetrics.registerFont(TTFont(name, p))

    for name, fname in [
        ('Poppins-Bold','Poppins-Bold.ttf'),
        ('Poppins-Regular','Poppins-Regular.ttf'),
        ('Poppins-Italic','Poppins-Italic.ttf'),
        ('Poppins-BoldItalic','Poppins-BoldItalic.ttf'),
    ]:
        for p in [os.path.join(FONTS, fname),
                  f'/usr/share/fonts/truetype/google-fonts/{fname}',
                  f'/Library/Fonts/{fname}']:
            if os.path.exists(p):
                pdfmetrics.registerFont(TTFont(name, p)); break


def get_lines(c, text, font, size, max_width):
    """Split text into wrapped lines."""
    words, lines, cur = str(text).split(), [], ''
    for w in words:
        t = f'{cur} {w}'.strip()
        if c.stringWidth(t, font, size) <= max_width: cur = t
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines or ['']


def field_height(c, text, font, size, max_width, lh=None):
    """Total height consumed by a wrapped text field."""
    if lh is None: lh = size * 1.35
    return len(get_lines(c, text, font, size, max_width)) * lh


def draw_label(c, text, font, size, x, y_pt, H):
    """Draw a single-line label. y_pt = pdfplumber top coord."""
    c.setFont(font, size)
    c.drawString(x, H - y_pt - size, text)


def draw_field(c, text, font, size, x, y_pt, max_width, H, lh=None):
    """
    Draw wrapped text starting at y_pt (pdfplumber top-origin).
    Returns the pdfplumber y coordinate AFTER the last line.
    """
    if lh is None: lh = size * 1.35
    rl_y = H - y_pt
    for line in get_lines(c, text, font, size, max_width):
        c.setFont(font, size)
        c.drawString(x, rl_y - size, line)
        rl_y -= lh
    return H - rl_y   # pdfplumber y after last line


def draw_logo_badge(c, rect_x, y_bottom, height, W):
    r=height/2; ym=y_bottom+r; yt=y_bottom+height
    p=c.beginPath()
    p.moveTo(rect_x,yt); p.lineTo(W,yt); p.lineTo(W,y_bottom); p.lineTo(rect_x,y_bottom)
    p.curveTo(rect_x-r*K,y_bottom,rect_x-r,ym-r*K,rect_x-r,ym)
    p.curveTo(rect_x-r,ym+r*K,rect_x-r*K,yt,rect_x,yt)
    p.close(); c.drawPath(p,fill=1,stroke=0)


def build_pdf(donation: dict, out_path: str):
    W, H = 595.5, 842.25

    BLUE      = (0.0784, 0.2549, 0.5098)
    BLACK     = (0.0,    0.0,    0.0)
    WHITE     = (1.0,    1.0,    1.0)
    GREY_BG   = (0.9216, 0.9216, 0.9216)
    BOX_BG    = (0.9804, 0.9804, 0.9804)
    DARK_LINE = (0.2196, 0.2196, 0.2196)
    WAVE_LITE = (0.5333, 0.6863, 0.8667)
    WAVE_MID  = (0.2784, 0.4627, 0.7255)

    # ── Spacing constants ─────────────────────────────────────────────────
    LBL_SIZE  = 13.032   # label font size
    VAL_SIZE  = 14.0     # value font size
    LV_GAP    = 4        # gap: label bottom → value top
    ROW_GAP   = 10       # gap: value bottom → next label top
    SEC_GAP   = 20       # gap between major sections

    # ── Fixed layout anchors ──────────────────────────────────────────────
    # Footer blue band always starts at top=752.9 (never moves)
    FOOTER_BAND_TOP = 752.9
    # Footer text positions (inside blue band — fixed)
    FOOTER1_Y = 768.673
    FOOTER2_Y = 784.429
    FOOTER3_Y = 820.0

    c = rl_canvas.Canvas(out_path, pagesize=(W, H))
    fi = lambda col: c.setFillColorRGB(*col)
    st = lambda col: c.setStrokeColorRGB(*col)
    rl = lambda top: H - top

    # ── 0. Page background ───────────────────────────────────────────────
    fi(GREY_BG); st(GREY_BG); c.rect(0, 0, W, H, fill=1, stroke=0)

    # ── 1. Watermark ─────────────────────────────────────────────────────
    bg = os.path.join(ASSETS, 'bg_watermark.png')
    if os.path.exists(bg):
        c.drawImage(bg, -9.0, rl(-125.1)-1076.7, width=613.7, height=1076.7, mask='auto')

    # ── 2. Header ─────────────────────────────────────────────────────────
    fi(GREY_BG); st(GREY_BG); c.rect(-14, rl(92.0), 623.3, 139.7, fill=1, stroke=0)

    fi(WAVE_MID); p=c.beginPath()
    p.moveTo(354.193,rl(31.315))
    p.curveTo(355.558,rl(31.279),356.923,rl(31.242),358.291,rl(31.199))
    p.curveTo(565.115,rl(24.699),609.410,rl(-4.098),609.410,rl(-4.098))
    p.lineTo(609.410,rl(91.423))
    p.curveTo(609.410,rl(91.423),565.115,rl(46.834),358.293,rl(53.336))
    p.curveTo(280.633,rl(55.776),208.819,rl(45.610),149.410,rl(31.961))
    p.curveTo(174.794,rl(33.953),203.897,rl(35.580),237.227,rl(36.627))
    p.curveTo(278.162,rl(37.913),317.469,rl(35.696),354.193,rl(31.313))
    p.lineTo(354.193,rl(31.315)); p.close(); c.drawPath(p,fill=1,stroke=0)

    fi(WAVE_LITE); p=c.beginPath()
    p.moveTo(27.819,rl(-27.251))
    p.curveTo(89.017,rl(-5.081),211.483,rl(30.871),354.193,rl(27.138))
    p.curveTo(317.468,rl(31.521),278.160,rl(33.739),237.227,rl(32.452))
    p.curveTo(203.897,rl(31.404),174.794,rl(29.777),149.410,rl(27.786))
    p.curveTo(17.283,rl(17.419),-13.890,rl(-2.843),-13.890,rl(-2.843))
    p.lineTo(-13.890,rl(-43.958))
    p.curveTo(-13.890,rl(-43.958),1.149,rl(-36.913),27.819,rl(-27.251))
    p.close(); c.drawPath(p,fill=1,stroke=0)

    fi(BLUE); p=c.beginPath()
    p.moveTo(609.410,rl(-48.135)); p.lineTo(609.410,rl(-12.451))
    p.curveTo(609.410,rl(-12.451),565.115,rl(16.345),358.293,rl(22.846))
    p.curveTo(356.924,rl(22.889),355.558,rl(22.926),354.194,rl(22.962))
    p.curveTo(211.484,rl(26.695),89.019,rl(-9.257),27.820,rl(-31.427))
    p.curveTo(1.149,rl(-41.090),-13.891,rl(-48.135),-13.891,rl(-48.135))
    p.lineTo(609.410,rl(-48.135)); p.close(); c.drawPath(p,fill=1,stroke=0)

    # ── 3. Footer blue band (drawn early, will be behind content if needed) ──
    fi(BLUE); st(BLUE)
    c.rect(-14, rl(884.4), 623.7, 131.5, fill=1, stroke=0)

    # ── 4. Logo badge ─────────────────────────────────────────────────────
    logo_x   = 463.4
    logo_top = 175.2 + 25
    logo_h   = 83.3
    fi(BLUE)
    draw_logo_badge(c, rect_x=logo_x+logo_h/2, y_bottom=rl(logo_top+logo_h),
                    height=logo_h, W=W)
    logo_img = os.path.join(ASSETS, 'logo_circle.png')
    if os.path.exists(logo_img):
        c.drawImage(logo_img, logo_x, rl(logo_top+logo_h), width=logo_h, height=logo_h, mask='auto')

    # ── 5. Org name ───────────────────────────────────────────────────────
    fi(BLACK); c.setFont('Agrandir-WideHeavy', 30.011)
    c.drawString(55.977, rl(95.198)-30.011, 'SDI EDUCATION CENTER')
    fi(BLUE); c.setFont('Garet-Bold', 11.029)
    c.drawString(419.623, rl(126.977)-11.029, 'REGD NO.: E-32359')

    # ── 6. DONATION RECEIPT ───────────────────────────────────────────────
    DR_Y = 171.2
    fi(BLACK); c.setFont('Agrandir-WideBold', 20.003)
    c.drawString(170.800, rl(DR_Y)-20.003, 'DONATION RECEIPT')
    st(DARK_LINE); c.setLineWidth(3.0)
    c.line(168.7, rl(DR_Y+20.003+4), 426.8, rl(DR_Y+20.003+4))
    fi(BLUE); c.setFont('Garet-Bold', 14.000)
    c.drawString(171.581, rl(DR_Y+20.003+4+8)-14.000,
                 f'RECEIPT NUMBER: {donation["receiptNumber"]}')

    # ── 7. DONOR INFORMATION — fully dynamic ─────────────────────────────
    y = 253.2   # pdfplumber y — flows downward through this section

    fi(BLUE); c.setFont('Garet-Bold', 20.003)
    c.drawString(47.161, rl(y)-20.003, 'DONOR INFORMATION')
    DI_UL = y + 20.003 + 4
    st(BLUE); c.setLineWidth(3.0)
    c.line(47.161, rl(DI_UL), 281.0, rl(DI_UL))
    y = DI_UL + 14   # 14pt gap after underline

    # Full Name label + value
    fi(BLACK); draw_label(c, 'Full Name:', 'Garet-Regular', LBL_SIZE, 47.161, y, H)
    y += LBL_SIZE + LV_GAP
    fi(BLUE)
    y = draw_field(c, donation['donorName'], 'Poppins-Bold', VAL_SIZE,
                   47.161, y, 310.0, H)

    # Phone + Address row — both labels on same line, then values below
    y += ROW_GAP
    ph_label_y = y
    fi(BLACK)
    draw_label(c, 'Phone Number:', 'Garet-Regular', LBL_SIZE, 47.161, ph_label_y, H)
    draw_label(c, 'Address:',      'Garet-Regular', LBL_SIZE, 300.0,  ph_label_y, H)
    y += LBL_SIZE + LV_GAP

    # Phone value (single line)
    fi(BLUE); c.setFont('Poppins-Bold', VAL_SIZE)
    c.drawString(47.161, rl(y)-VAL_SIZE, f'+91 {donation["mobileNumber"]}')
    y_after_phone = y + VAL_SIZE * 1.35

    # Address value (may wrap multiple lines)
    fi(BLUE)
    y_after_addr = draw_field(c, donation['address'], 'Poppins-Bold', VAL_SIZE,
                              300.0, y, 200.0, H)

    # donor_bottom = whichever field ends lower on the page
    y = max(y_after_phone, y_after_addr)

    # ── 8. DONATION DETAILS box — fully dynamic ───────────────────────────
    # Box top = donor_bottom + gap (never above MIN_BOX_Y)
    MIN_BOX_Y = 370.0
    BOX_PAD   = 20
    BOX_TOP   = max(MIN_BOX_Y, y + BOX_PAD)
    BOX_PAD_INNER = 12   # top padding inside box

    # Draw box background AFTER we know its height (compute first pass)
    # ── Compute row positions inside box ──────────────────────────────────
    iy = BOX_TOP + BOX_PAD_INNER   # iy = current y inside box

    # Heading
    HD_Y   = iy
    UL_Y   = HD_Y + 20.003 + 4
    iy     = UL_Y + 12              # gap after underline

    # Row 1 — Donation Type + Date
    R1_LBL = iy
    R1_VAL = R1_LBL + LBL_SIZE + LV_GAP
    h_r1_left  = field_height(c, donation['donationType'], 'Poppins-Bold', VAL_SIZE, 140.0)
    h_r1_right = VAL_SIZE * 1.35   # date is always 1 line
    iy = R1_VAL + max(h_r1_left, h_r1_right) + ROW_GAP

    # Row 2 — Payment Mode + Prepared By
    R2_LBL = iy
    R2_VAL = R2_LBL + LBL_SIZE + LV_GAP
    h_r2_left  = field_height(c, donation['mode'],  'Poppins-Bold', VAL_SIZE, 140.0)
    h_r2_right = field_height(c, donation['fills'], 'Poppins-Bold', VAL_SIZE, 155.0)
    iy = R2_VAL + max(h_r2_left, h_r2_right) + ROW_GAP

    # Row 3 — Zone + Branch
    R3_LBL = iy
    R3_VAL = R3_LBL + LBL_SIZE + LV_GAP
    h_r3_left  = field_height(c, donation.get('zone',''),   'Poppins-Bold', VAL_SIZE, 140.0)
    h_r3_right = field_height(c, donation.get('branch',''), 'Poppins-Bold', VAL_SIZE, 155.0)
    iy = R3_VAL + max(h_r3_left, h_r3_right)

    BOX_BOT_CONTENT = iy + BOX_PAD_INNER   # box bottom follows content

    # Amount box spans ALL 3 rows — visually balanced against all data rows
    AMT_TOP   = R1_LBL - 4
    AMT_BOT   = R3_VAL + max(h_r3_left, h_r3_right) + 6
    AMT_H     = AMT_BOT - AMT_TOP
    BAND_H    = 38.0
    WH_TOP    = AMT_TOP + BAND_H + 3
    WH_BOT    = AMT_BOT - 3
    WH_H      = max(WH_BOT - WH_TOP, 44.0)

    # Final box bottom = max of content and amount box
    BOX_BOT = max(BOX_BOT_CONTENT, AMT_BOT + BOX_PAD_INNER)

    # ── Cap BOX_BOT so blessing text ALWAYS fits above footer ───────────
    # Reserve 70pt below box for blessing text (no arabic in extreme cases)
    BOX_BOT_MAX = FOOTER_BAND_TOP - 70
    BOX_BOT     = min(BOX_BOT, BOX_BOT_MAX)

    # ── If rows overflow the capped box, clip them to a safe Y inside box ──
    # Rows must not draw below (BOX_BOT - BOX_PAD_INNER)
    ROW_MAX_Y = BOX_BOT - BOX_PAD_INNER
    # Clamp each row's LBL/VAL to stay within the box
    def clamp(y):  return min(y, ROW_MAX_Y - 1)
    R1_LBL = clamp(R1_LBL); R1_VAL = clamp(R1_VAL)
    R2_LBL = clamp(R2_LBL); R2_VAL = clamp(R2_VAL)
    R3_LBL = clamp(R3_LBL); R3_VAL = clamp(R3_VAL)
    # Also clamp amount box
    AMT_TOP = min(AMT_TOP, R1_LBL - 4)
    AMT_BOT = min(AMT_BOT, R3_VAL + max(h_r3_left, h_r3_right) + 6)
    WH_TOP  = AMT_TOP + BAND_H + 3
    WH_BOT  = min(AMT_BOT - 3, ROW_MAX_Y)
    WH_H    = max(WH_BOT - WH_TOP, 40.0)

    # ── Now draw the box background ───────────────────────────────────────
    fi(BOX_BG); st(BOX_BG)
    c.rect(24.6, rl(BOX_BOT), 546.6, BOX_BOT-BOX_TOP, fill=1, stroke=0)

    # ── Draw box heading + underline ─────────────────────────────────────
    fi(BLUE); c.setFont('Garet-Bold', 20.003)
    c.drawString(49.728, rl(HD_Y)-20.003, 'DONATION DETAILS')
    st(BLUE); c.setLineWidth(3.0)
    c.line(49.0, rl(UL_Y), 255.0, rl(UL_Y))

    # ── Row 1 ─────────────────────────────────────────────────────────────
    fi(BLACK); c.setFont('Garet-Regular', LBL_SIZE)
    c.drawString(49.728,  rl(R1_LBL)-LBL_SIZE, 'Donation Type')
    c.drawString(201.189, rl(R1_LBL)-LBL_SIZE, 'Date of Donation')
    fi(BLUE)
    draw_field(c, donation['donationType'], 'Poppins-Bold', VAL_SIZE, 49.728, R1_VAL, 140.0, H)
    c.setFont('Garet-Bold', 14.030)
    c.drawString(201.189, rl(R1_VAL)-14.030, donation['date'])

    # ── Row 2 ─────────────────────────────────────────────────────────────
    fi(BLACK); c.setFont('Garet-Regular', LBL_SIZE)
    c.drawString(49.728,  rl(R2_LBL)-LBL_SIZE, 'Payment Mode')
    c.drawString(201.189, rl(R2_LBL)-LBL_SIZE, 'Prepared By')
    fi(BLUE)
    draw_field(c, donation['mode'],  'Poppins-Bold', VAL_SIZE, 49.728,  R2_VAL, 140.0, H)
    draw_field(c, donation['fills'], 'Poppins-Bold', VAL_SIZE, 201.189, R2_VAL, 155.0, H)

    # ── Row 3 — only draw if it fits within the box ─────────────────────
    if R3_LBL < ROW_MAX_Y - LBL_SIZE:
        fi(BLACK); c.setFont('Poppins-Regular', LBL_SIZE)
        c.drawString(49.728,  rl(R3_LBL)-LBL_SIZE, 'Zone')
        c.drawString(201.189, rl(R3_LBL)-LBL_SIZE, 'Branch')
        if R3_VAL < ROW_MAX_Y - VAL_SIZE:
            fi(BLUE)
            draw_field(c, donation.get('zone',''),   'Poppins-Bold', VAL_SIZE, 49.728,  R3_VAL, 140.0, H)
            draw_field(c, donation.get('branch',''), 'Poppins-Bold', VAL_SIZE, 201.189, R3_VAL, 155.0, H)

    # ── Amount box ────────────────────────────────────────────────────────
    fi(BLUE); st(BLUE)
    c.rect(373.4, rl(AMT_BOT), 180.0, AMT_H, fill=1, stroke=0)
    fi(WHITE)
    c.rect(377.0, rl(WH_BOT), 172.8, WH_H, fill=1, stroke=0)
    st(BLUE); c.setLineWidth(1.5)
    c.rect(373.4, rl(AMT_BOT), 180.0, AMT_H, fill=0, stroke=1)

    fi(WHITE); c.setFont('Garet-Bold', 11.5)
    lbl = 'TOTAL AMOUNT RECEIVED'
    lbl_y = AMT_TOP + BAND_H/2 + 11.5*0.35
    c.drawString(373.4 + (180.0-c.stringWidth(lbl,'Garet-Bold',11.5))/2, rl(lbl_y), lbl)

    fs      = 32.0
    amt_str = f'{int(donation["amount"]):,}'
    rupee_w = c.stringWidth('\u20B9', 'NotoSans-Bold', fs)
    num_w   = c.stringWidth(amt_str,  'Garet-Bold',    fs)
    if rupee_w + num_w > 162:
        fs = fs * 162 / (rupee_w + num_w)
    amt_y   = rl(WH_BOT) + WH_H/2 - fs*0.35
    total_w = c.stringWidth('\u20B9','NotoSans-Bold',fs) + c.stringWidth(amt_str,'Garet-Bold',fs)
    x0      = 373.4 + (180.0 - total_w) / 2
    fi(BLUE)
    c.setFont('NotoSans-Bold', fs); c.drawString(x0, amt_y, '\u20B9')
    c.setFont('Garet-Bold',    fs); c.drawString(x0 + c.stringWidth('\u20B9','NotoSans-Bold',fs), amt_y, amt_str)

    # ── 9. Arabic + Blessing — dynamically fits between BOX_BOT and footer ──
    ARABIC_H = 77.7
    SAFE_END = FOOTER_BAND_TOP - 4    # BL3 + font must be above this
    BL_TOTAL = 14.030 + 5 + 13.032 + 5 + 13.032   # 3 blessing lines ≈ 50pt
    available = SAFE_END - BOX_BOT

    # Decide whether to show arabic calligraphy based on available space
    MIN_WITH_ARABIC    = 6 + ARABIC_H + 4 + BL_TOTAL    # ~138pt min (permissive)
    show_arabic = available >= MIN_WITH_ARABIC

    if show_arabic:
        # Spread evenly in available space
        spare     = available - ARABIC_H - BL_TOTAL
        gap_above = max(10, min(26, spare * 0.45))
        gap_mid   = max(6,  min(14, spare * 0.35))
        AR_TOP = BOX_BOT + gap_above
        ar = os.path.join(ASSETS, 'arabic_calligraphy.png')
        if os.path.exists(ar):
            c.drawImage(ar, 178.6, rl(AR_TOP+ARABIC_H),
                        width=238.1, height=ARABIC_H, mask='auto')
        BL1 = AR_TOP + ARABIC_H + gap_mid
    else:
        # Not enough room — skip arabic, show blessing only with equal spacing
        gap_above = max(8, (available - BL_TOTAL) / 2)
        BL1 = BOX_BOT + gap_above

    BL2 = BL1 + 14.030 + 5
    BL3 = BL2 + 13.032 + 5
    fi(BLUE); c.setFont('Garet-Bold', 14.030)
    t1 = '"May Allah reward you with goodness"'
    c.drawString((W-c.stringWidth(t1,'Garet-Bold',14.030))/2, rl(BL1)-14.030, t1)
    fi(BLACK); c.setFont('Garet-Regular', 13.032)
    t2 = 'Your donation is a Sadaqah.'
    c.drawString((W-c.stringWidth(t2,'Garet-Regular',13.032))/2, rl(BL2)-13.032, t2)
    t3 = 'May Allah accept it and bless you in this world and the Hereafter.'
    c.drawString((W-c.stringWidth(t3,'Garet-Regular',13.032))/2, rl(BL3)-13.032, t3)

    # ── 10. Footer text (inside blue band, always fixed) ──────────────────
    fi(WHITE); c.setFont('Poppins-Italic', 10.031)
    ft1 = 'This is an official receipt for your donation records. Please retain for your reference.'
    c.drawString((W-c.stringWidth(ft1,'Poppins-Italic',10.031))/2, rl(FOOTER1_Y)-10.031, ft1)
    ft2 = f'Generated: {donation.get("generatedAt","")} | Receipt: {donation["receiptNumber"]}'
    c.drawString((W-c.stringWidth(ft2,'Poppins-Italic',10.031))/2, rl(FOOTER2_Y)-10.031, ft2)
    c.setFont('Poppins-BoldItalic', 10.031)
    c.drawString(41.619,  rl(FOOTER3_Y)-10.031, '• SDI EDUCATION CENTER')
    c.drawString(450.369, rl(FOOTER3_Y)-10.031, '• AUTHORIZED RECEIPT')

    c.save()


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 generate_receipt.py '<JSON>' <output_path>", file=sys.stderr)
        sys.exit(1)
    register_fonts()
    build_pdf(json.loads(sys.argv[1]), sys.argv[2])
    print(f'OK:{sys.argv[2]}')

if __name__ == '__main__':
    main()