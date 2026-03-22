#!/usr/bin/env python3
"""
SDI Education Center — PDF Receipt Generator (v13 final)
All spacing, address position, amount box height, and footer gap finalized.
"""
import sys, os, json
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

BASE   = os.path.dirname(os.path.abspath(__file__))
FONTS  = os.path.join(BASE, 'fonts')
ASSETS = os.path.join(BASE, 'assets')
K      = 0.5523   # bezier quarter-circle constant


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


def wrap_text(c, text, font, size, max_width):
    words, lines, cur = str(text).split(), [], ''
    for w in words:
        t = f'{cur} {w}'.strip()
        if c.stringWidth(t, font, size) <= max_width: cur = t
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines or ['']


def draw_wrapped(c, text, font, size, x, y, max_width, lh=None):
    if lh is None: lh = size * 1.35
    for line in wrap_text(c, text, font, size, max_width):
        c.setFont(font, size); c.drawString(x, y, line); y -= lh
    return y


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

    c = rl_canvas.Canvas(out_path, pagesize=(W, H))
    fi = lambda col: c.setFillColorRGB(*col)
    st = lambda col: c.setStrokeColorRGB(*col)
    rl = lambda top: H - top   # pdfplumber top-origin → reportlab y

    # ── 0. Page background ───────────────────────────────────────────────
    fi(GREY_BG); st(GREY_BG); c.rect(0, 0, W, H, fill=1, stroke=0)

    # ── 1. Watermark ─────────────────────────────────────────────────────
    bg = os.path.join(ASSETS, 'bg_watermark.png')
    if os.path.exists(bg):
        c.drawImage(bg, -9.0, rl(-125.1)-1076.7, width=613.7, height=1076.7, mask='auto')

    # ── 2. Header grey base ───────────────────────────────────────────────
    fi(GREY_BG); st(GREY_BG)
    c.rect(-14, rl(92.0), 623.3, 139.7, fill=1, stroke=0)

    # ── 3. Waves ──────────────────────────────────────────────────────────
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

    # ── 4. Footer blue band ───────────────────────────────────────────────
    fi(BLUE); st(BLUE)
    c.rect(-14, rl(884.4), 623.7, 131.5, fill=1, stroke=0)

    # ── 5. Logo badge — down 25pt from original ───────────────────────────
    logo_x   = 463.4
    logo_top = 175.2 + 25    # 200.2
    logo_h   = 83.3
    logo_cx  = logo_x + logo_h/2
    fi(BLUE)
    draw_logo_badge(c, rect_x=logo_cx, y_bottom=rl(logo_top+logo_h),
                    height=logo_h, W=W)
    logo_img = os.path.join(ASSETS, 'logo_circle.png')
    if os.path.exists(logo_img):
        c.drawImage(logo_img, logo_x, rl(logo_top+logo_h),
                    width=logo_h, height=logo_h, mask='auto')

    # ── 6. SDI EDUCATION CENTER ───────────────────────────────────────────
    fi(BLACK); c.setFont('Agrandir-WideHeavy', 30.011)
    c.drawString(55.977, rl(95.198)-30.011, 'SDI EDUCATION CENTER')
    fi(BLUE); c.setFont('Garet-Bold', 11.029)
    c.drawString(419.623, rl(126.977)-11.029, 'REGD NO.: E-32359')

    # ── 7. DONATION RECEIPT ───────────────────────────────────────────────
    # +10pt gap vs v12 below SDI/REGD section
    DR_Y = 171.2
    fi(BLACK); c.setFont('Agrandir-WideBold', 20.003)
    c.drawString(170.800, rl(DR_Y)-20.003, 'DONATION RECEIPT')
    st(DARK_LINE); c.setLineWidth(3.0)
    c.line(168.7, rl(DR_Y+20.003+4), 426.8, rl(DR_Y+20.003+4))
    fi(BLUE); c.setFont('Garet-Bold', 14.000)
    c.drawString(171.581, rl(DR_Y+20.003+4+8)-14.000,
                 f'RECEIPT NUMBER: {donation["receiptNumber"]}')

    # ── 8. DONOR INFORMATION ─────────────────────────────────────────────
    # +36pt gap below receipt number (+6pt more than v12)
    DI_Y  = 253.2
    DI_UL = 277.2
    fi(BLUE); c.setFont('Garet-Bold', 20.003)
    c.drawString(47.161, rl(DI_Y)-20.003, 'DONOR INFORMATION')
    st(BLUE); c.setLineWidth(3.0)
    c.line(47.161, rl(DI_UL), 281.0, rl(DI_UL))

    LV = 5   # label-to-value gap (pt)

    # Full Name
    FN_LBL = 289.2
    FN_VAL = 307.2
    fi(BLACK); c.setFont('Garet-Regular', 13.032)
    c.drawString(47.161, rl(FN_LBL)-13.032, 'Full Name:')
    fi(BLUE)
    draw_wrapped(c, donation['donorName'], 'Poppins-Bold', 14.0,
                 47.161, rl(FN_VAL)-14.0, max_width=310.0)

    # Phone + Address  — address moved left to x=300 (was 384.540)
    PH_LBL = 339.2
    PH_VAL = 357.3
    ADDR_X = 300.0   # moved left from 384.540
    fi(BLACK); c.setFont('Garet-Regular', 13.032)
    c.drawString(47.161,  rl(PH_LBL)-13.032, 'Phone Number:')
    c.drawString(ADDR_X,  rl(PH_LBL)-13.032, 'Address:')
    fi(BLUE); c.setFont('Poppins-Bold', 14.0)
    c.drawString(47.161, rl(PH_VAL)-14.0, f'+91 {donation["mobileNumber"]}')
    fi(BLUE)
    draw_wrapped(c, donation['address'], 'Poppins-Bold', 14.0,
                 ADDR_X, rl(PH_VAL)-14.0, max_width=200.0)  # wider max_width now

    # ── 9. DONATION DETAILS box ───────────────────────────────────────────
    BOX_TOP = 381.3
    BOX_H   = 210.0
    BOX_BOT = 591.3
    fi(BOX_BG); st(BOX_BG)
    c.rect(24.6, rl(BOX_BOT), 546.6, BOX_H, fill=1, stroke=0)

    # Heading + underline
    HD_Y = 395.3
    UL_Y = 419.3
    fi(BLUE); c.setFont('Garet-Bold', 20.003)
    c.drawString(49.728, rl(HD_Y)-20.003, 'DONATION DETAILS')
    st(BLUE); c.setLineWidth(3.0)
    c.line(49.0, rl(UL_Y), 255.0, rl(UL_Y))

    # Row 1 — Donation Type + Date
    R1_LBL = 433.3
    R1_VAL = 451.3
    fi(BLACK); c.setFont('Garet-Regular', 13.032)
    c.drawString(49.728,  rl(R1_LBL)-13.032, 'Donation Type')
    c.drawString(201.189, rl(R1_LBL)-13.032, 'Date of Donation')
    fi(BLUE)
    draw_wrapped(c, donation['donationType'], 'Poppins-Bold', 14.0,
                 49.728, rl(R1_VAL)-14.0, max_width=140.0)
    c.setFont('Garet-Bold', 14.030)
    c.drawString(201.189, rl(R1_VAL)-14.030, donation['date'])

    # Row 2 — Payment Mode + Prepared By
    R2_LBL = 481.3
    R2_VAL = 499.3
    fi(BLACK); c.setFont('Garet-Regular', 13.032)
    c.drawString(49.728,  rl(R2_LBL)-13.032, 'Payment Mode')
    c.drawString(201.189, rl(R2_LBL)-13.032, 'Prepared By')
    fi(BLUE)
    draw_wrapped(c, donation['mode'],  'Poppins-Bold', 14.0,
                 49.728,  rl(R2_VAL)-14.0, max_width=140.0)
    draw_wrapped(c, donation['fills'], 'Poppins-Bold', 14.0,
                 201.189, rl(R2_VAL)-14.0, max_width=155.0)

    # Row 3 — Zone + Branch
    R3_LBL = 529.3
    R3_VAL = 547.3
    fi(BLACK); c.setFont('Poppins-Regular', 13.032)
    c.drawString(49.728,  rl(R3_LBL)-13.032, 'Zone')
    c.drawString(201.189, rl(R3_LBL)-13.032, 'Branch')
    fi(BLUE)
    draw_wrapped(c, donation.get('zone',''),   'Poppins-Bold', 14.0,
                 49.728,  rl(R3_VAL)-14.0, max_width=140.0)
    draw_wrapped(c, donation.get('branch',''), 'Poppins-Bold', 14.0,
                 201.189, rl(R3_VAL)-14.0, max_width=155.0)

    # ── 10. Amount box ────────────────────────────────────────────────────
    # Spans rows 1+2. AMT_BOT extended +8pt for taller white panel.
    # White panel now 52pt tall — fits 5-digit amounts (₹99,999) comfortably.
    AMT_TOP  = 429.3
    AMT_BOT  = 525.3   # R2_VAL(507.3)+14+4+8 = 533.3  (+8 vs previous)
    AMT_H    = AMT_BOT - AMT_TOP   # = 96pt

    BAND_H   = 38.0    # blue top band height — enough for "TOTAL AMOUNT RECEIVED"
    WH_TOP   = AMT_TOP + BAND_H + 3
    WH_BOT   = AMT_BOT - 3
    WH_H     = WH_BOT - WH_TOP     # = 52pt

    fi(BLUE); st(BLUE)
    c.rect(373.4, rl(AMT_BOT), 180.0, AMT_H, fill=1, stroke=0)
    fi(WHITE)
    c.rect(377.0, rl(WH_BOT), 172.8, WH_H, fill=1, stroke=0)
    st(BLUE); c.setLineWidth(1.5)
    c.rect(373.4, rl(AMT_BOT), 180.0, AMT_H, fill=0, stroke=1)

    # "TOTAL AMOUNT RECEIVED" — vertically centred in blue band
    fi(WHITE); c.setFont('Garet-Bold', 11.5)
    lbl = 'TOTAL AMOUNT RECEIVED'
    lbl_y = AMT_TOP + BAND_H/2 + 11.5*0.35
    c.drawString(373.4 + (180.0-c.stringWidth(lbl,'Garet-Bold',11.5))/2,
                 rl(lbl_y), lbl)

    # Amount — vertically centred in white panel, fits up to ₹99,999
    fs    = 32.0   # slightly smaller than 36.337 to ensure 5 digits fit in 172.8pt width
    amt_y = rl(WH_BOT) + WH_H/2 - fs*0.35
    # Auto-scale font if amount string is very wide
    amt_str = f'{int(donation["amount"]):,}'
    rupee_w = c.stringWidth('\u20B9', 'NotoSans-Bold', fs)
    num_w   = c.stringWidth(amt_str,  'Garet-Bold',    fs)
    if rupee_w + num_w > 162:   # max safe width
        fs = fs * 162 / (rupee_w + num_w)
        amt_y = rl(WH_BOT) + WH_H/2 - fs*0.35

    fi(BLUE)
    c.setFont('NotoSans-Bold', fs)
    c.drawString(373.4 + (180.0 - c.stringWidth('\u20B9','NotoSans-Bold',fs)
                          - c.stringWidth(amt_str,'Garet-Bold',fs))/2,
                 amt_y, '\u20B9')
    c.setFont('Garet-Bold', fs)
    c.drawString(373.4 + (180.0 - c.stringWidth('\u20B9','NotoSans-Bold',fs)
                          - c.stringWidth(amt_str,'Garet-Bold',fs))/2
                        + c.stringWidth('\u20B9','NotoSans-Bold',fs),
                 amt_y, amt_str)

    # ── 11. Arabic calligraphy ────────────────────────────────────────────
    # +22pt gap below box bottom, +14pt gap above (from previous +27→22 = less gap above
    # but +16pt footer gap → net result: more space above footer)
    AR_TOP = 617.3   # 26pt gap from box bottom
    ar = os.path.join(ASSETS, 'arabic_calligraphy.png')
    if os.path.exists(ar):
        c.drawImage(ar, 178.6, rl(AR_TOP+77.7), width=238.1, height=77.7, mask='auto')

    # ── 12. Blessing text ─────────────────────────────────────────────────
    BL1 = 699.0   # 4pt below arabic bottom
    BL2 = 715.0   # BL1 + 13.032 + 3
    BL3 = 731.1   # BL2 + 13.032 + 3
    fi(BLUE); c.setFont('Garet-Bold', 14.030)
    t1 = '"May Allah reward you with goodness"'
    c.drawString((W-c.stringWidth(t1,'Garet-Bold',14.030))/2, rl(BL1)-14.030, t1)
    fi(BLACK); c.setFont('Garet-Regular', 13.032)
    t2 = 'Your donation is a Sadaqah.'
    c.drawString((W-c.stringWidth(t2,'Garet-Regular',13.032))/2, rl(BL2)-13.032, t2)
    t3 = 'May Allah accept it and bless you in this world and the Hereafter.'
    c.drawString((W-c.stringWidth(t3,'Garet-Regular',13.032))/2, rl(BL3)-13.032, t3)

    # ── 13. Footer — +8pt more space before footer text ───────────────────
    # Footer text moved to 776 (was 768.673) for more space above footer band
    FOOTER1 = 768.673
    FOOTER2 = 784.429
    fi(WHITE); c.setFont('Poppins-Italic', 10.031)
    ft1 = 'This is an official receipt for your donation records. Please retain for your reference.'
    c.drawString((W-c.stringWidth(ft1,'Poppins-Italic',10.031))/2, rl(FOOTER1)-10.031, ft1)
    ft2 = f'Generated: {donation.get("generatedAt","")} | Receipt: {donation["receiptNumber"]}'
    c.drawString((W-c.stringWidth(ft2,'Poppins-Italic',10.031))/2, rl(FOOTER2)-10.031, ft2)
    c.setFont('Poppins-BoldItalic', 10.031)
    c.drawString(41.619,  rl(820.0)-10.031, '• SDI EDUCATION CENTER')
    c.drawString(450.369, rl(820.0)-10.031, '• AUTHORIZED RECEIPT')

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