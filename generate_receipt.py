#!/usr/bin/env python3
"""
SDI Education Center — PDF Receipt Generator (v22 — pixel-perfect final)
Measurements extracted directly from RCP-2026-0006 sample PDF via pdfplumber.
Fully dynamic layout — no overlap regardless of content length.
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
    words, lines, cur = str(text).split(), [], ''
    for w in words:
        t = f'{cur} {w}'.strip()
        if c.stringWidth(t, font, size) <= max_width: cur = t
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines or ['']


def field_height(c, text, font, size, max_width):
    return len(get_lines(c, text, font, size, max_width)) * (size * 1.35)


def draw_label(c, text, font, size, x, y_pt, H):
    c.setFont(font, size)
    c.drawString(x, H - y_pt - size, text)


def draw_field(c, text, font, size, x, y_pt, max_width, H):
    lh   = size * 1.35
    rl_y = H - y_pt
    for line in get_lines(c, text, font, size, max_width):
        c.setFont(font, size)
        c.drawString(x, rl_y - size, line)
        rl_y -= lh
    return H - rl_y


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

    # Typography constants
    LBL_SIZE = 13.032
    VAL_SIZE = 14.030
    LV_GAP   = 4     # label baseline → value top
    ROW_GAP  = 10    # value bottom   → next label top

    # Fixed footer positions
    FOOTER_BAND_TOP = 752.9
    FOOTER1_Y = 768.67
    FOOTER2_Y = 784.43
    FOOTER3_Y = 809.67

    c = rl_canvas.Canvas(out_path, pagesize=(W, H))
    fi = lambda col: c.setFillColorRGB(*col)
    st = lambda col: c.setStrokeColorRGB(*col)
    rl = lambda top: H - top

    # ── 0. Page background ──────────────────────────────────────────────
    fi(GREY_BG); st(GREY_BG); c.rect(0, 0, W, H, fill=1, stroke=0)

    # ── 1. Watermark ────────────────────────────────────────────────────
    bg = os.path.join(ASSETS, 'bg_watermark.png')
    if os.path.exists(bg):
        c.drawImage(bg, -9.0, rl(-125.1)-1076.7, width=613.7, height=1076.7, mask='auto')

    # ── 2. Header grey base ──────────────────────────────────────────────
    fi(GREY_BG); st(GREY_BG)
    c.rect(-14, rl(92.0), 623.3, 139.7, fill=1, stroke=0)

    # ── 3. Waves — mirrored (dark blue on LEFT, flows right) ─────────────
    # All X coords mirrored: new_x = 595.5 - original_x
    fi(WAVE_MID); p=c.beginPath()
    p.moveTo(241.307,rl(31.315))
    p.curveTo(239.942,rl(31.279),238.577,rl(31.242),237.209,rl(31.199))
    p.curveTo(30.385,rl(24.699),-13.910,rl(-4.098),-13.910,rl(-4.098))
    p.lineTo(-13.910,rl(91.423))
    p.curveTo(-13.910,rl(91.423),30.385,rl(46.834),237.207,rl(53.336))
    p.curveTo(314.867,rl(55.776),386.681,rl(45.610),446.090,rl(31.961))
    p.curveTo(420.706,rl(33.953),391.603,rl(35.580),358.273,rl(36.627))
    p.curveTo(317.338,rl(37.913),278.031,rl(35.696),241.307,rl(31.313))
    p.lineTo(241.307,rl(31.315)); p.close(); c.drawPath(p,fill=1,stroke=0)

    fi(WAVE_LITE); p=c.beginPath()
    p.moveTo(567.681,rl(-27.251))
    p.curveTo(506.483,rl(-5.081),384.017,rl(30.871),241.307,rl(27.138))
    p.curveTo(278.032,rl(31.521),317.340,rl(33.739),358.273,rl(32.452))
    p.curveTo(391.603,rl(31.404),420.706,rl(29.777),446.090,rl(27.786))
    p.curveTo(578.217,rl(17.419),609.390,rl(-2.843),609.390,rl(-2.843))
    p.lineTo(609.390,rl(-43.958))
    p.curveTo(609.390,rl(-43.958),594.351,rl(-36.913),567.681,rl(-27.251))
    p.close(); c.drawPath(p,fill=1,stroke=0)

    fi(BLUE); p=c.beginPath()
    p.moveTo(-13.910,rl(-48.135)); p.lineTo(-13.910,rl(-12.451))
    p.curveTo(-13.910,rl(-12.451),30.385,rl(16.345),237.207,rl(22.846))
    p.curveTo(238.576,rl(22.889),239.942,rl(22.926),241.306,rl(22.962))
    p.curveTo(384.016,rl(26.695),506.481,rl(-9.257),567.680,rl(-31.427))
    p.curveTo(594.351,rl(-41.090),609.391,rl(-48.135),609.391,rl(-48.135))
    p.lineTo(-13.910,rl(-48.135)); p.close(); c.drawPath(p,fill=1,stroke=0)

    # ── 4. Footer blue band ──────────────────────────────────────────────
    fi(BLUE); st(BLUE)
    c.rect(-14, rl(884.4), 623.7, 131.5, fill=1, stroke=0)

    # ── 5. Logo badge (top=164.7, h=83.3) ───────────────────────────────
    logo_x  = 463.4; logo_top = 164.7; logo_h = 83.3
    fi(BLUE)
    draw_logo_badge(c, rect_x=logo_x+logo_h/2, y_bottom=rl(logo_top+logo_h),
                    height=logo_h, W=W)
    logo_img = os.path.join(ASSETS, 'logo_circle.png')
    if os.path.exists(logo_img):
        c.drawImage(logo_img, logo_x, rl(logo_top+logo_h),
                    width=logo_h, height=logo_h, mask='auto')

    # ── 6. Header text ───────────────────────────────────────────────────
    # REGD NO.: E-32359 (top=74.46 — above SDI name)
    fi(BLUE); c.setFont('Garet-Bold', 11.029)
    c.drawString(426.08, rl(74.46)-11.029, 'REGD NO.: E-32359')

    # SDI EDUCATION CENTER (top=86.94, size=30.011)
    fi(BLACK); c.setFont('Agrandir-WideHeavy', 30.011)
    c.drawString(55.98, rl(86.94)-30.011, 'SDI EDUCATION CENTER')

    # FIX 1: Space between SDI name and shop address
    # Sample: SDI top=86.94 + font=30.011 = bottom≈117 → shop at 117.21 (tight)
    # We add 8pt breathing room: shop at 86.94 + 30.011 + 8 = 124.95
    SHOP_Y = 86.94 + 30.011 + 8   # = 124.95pt (8pt gap after SDI name)
    fi(BLACK); c.setFont('Poppins-Regular', 9.003)
    shop = 'Shop No. 1, Qureshi Chawl, Opp. Parthamesh Park, Veera Desai Road, Behram Baug, Jogeshwari (W), Mumbai-102'
    c.drawString(57.79, rl(SHOP_Y)-9.003, shop)

    # ── 7. DONATION RECEIPT ─────────────────────────────────────────────
    # FIX 2: Space between heading text and underline
    # Sample has 2pt gap (text_bottom → underline). We use 6pt for breathing room.
    DR_TOP   = 152.93        # DONATION RECEIPT text top
    DR_SIZE  = 20.003
    UL1_TOP  = DR_TOP + DR_SIZE + 6   # = 178.93  (+6pt gap text→underline)

    fi(BLACK); c.setFont('Agrandir-WideBold', DR_SIZE)
    c.drawString(46.79, rl(DR_TOP)-DR_SIZE, 'DONATION RECEIPT')
    st(DARK_LINE); c.setLineWidth(3.0)
    c.line(47.16, rl(UL1_TOP), 301.10, rl(UL1_TOP))

    # RECEIPT NUMBER: 10pt below underline
    RN_TOP = UL1_TOP + 10
    fi(BLUE); c.setFont('Garet-Bold', 14.000)
    c.drawString(47.57, rl(RN_TOP)-14.000,
                 f'RECEIPT NUMBER: {donation["receiptNumber"]}')

    # ── 8. DONOR INFORMATION ────────────────────────────────────────────
    # FIX 2: Space between heading and underline (+6pt)
    DI_TOP  = RN_TOP + 14.000 + 18   # 18pt gap after receipt number
    DI_SIZE = 20.003
    UL2_TOP = DI_TOP + DI_SIZE + 6   # +6pt gap text→underline

    fi(BLUE); c.setFont('Garet-Bold', DI_SIZE)
    c.drawString(47.161, rl(DI_TOP)-DI_SIZE, 'DONOR INFORMATION')
    st(BLUE); c.setLineWidth(3.0)
    c.line(47.161, rl(UL2_TOP), 281.04, rl(UL2_TOP))

    # ── 9. DONOR SECTION — fully dynamic ────────────────────────────────
    y = UL2_TOP + 16   # 16pt gap after underline (from sample: 16.65pt)

    # Full Name label + value
    fi(BLACK); draw_label(c, 'Full Name:', 'Garet-Regular', LBL_SIZE, 47.161, y, H)
    y += LBL_SIZE + LV_GAP
    fi(BLUE)
    y = draw_field(c, donation['donorName'], 'Poppins-Bold', VAL_SIZE,
                   47.161, y, 310.0, H)

    # Phone + Address — on same row
    y += ROW_GAP + 4
    ph_y = y
    fi(BLACK)
    draw_label(c, 'Phone Number:', 'Garet-Regular', LBL_SIZE, 47.161, ph_y, H)
    # FIX 3: Address moved left to x=300 for more width (280pt available vs 196pt)
    draw_label(c, 'Address:',      'Garet-Regular', LBL_SIZE, 300.0,  ph_y, H)
    y += LBL_SIZE + LV_GAP

    fi(BLUE); c.setFont('Poppins-Bold', VAL_SIZE)
    c.drawString(47.161, rl(y)-VAL_SIZE, f'+91 {donation["mobileNumber"]}')
    y_after_phone = y + VAL_SIZE * 1.35

    fi(BLUE)
    # FIX 3: Address max_width increased to 260pt (595.5 - 300 - 35 margin)
    y_after_addr = draw_field(c, donation['address'], 'Poppins-Bold', VAL_SIZE,
                              300.0, y, 260.0, H)

    donor_bottom = max(y_after_phone, y_after_addr)

    # ── 10. DONATION DETAILS box — fully dynamic ─────────────────────────
    MIN_BOX_Y  = 341.0    # box never starts above this
    BOX_PAD    = 20       # gap from donor_bottom → box top
    BOX_TOP    = max(MIN_BOX_Y, donor_bottom + BOX_PAD)
    BOX_PAD_IN = 14       # inner top/bottom padding

    # Heading: FIX 2: +6pt gap between text and underline
    HD_Y   = BOX_TOP + BOX_PAD_IN         # heading text top
    HD_SIZE = 20.003
    UL3_TOP = HD_Y + HD_SIZE + 6          # +6pt gap
    iy      = UL3_TOP + 16                # 16pt gap after underline (sample: 16.88)

    # Row 1 — Donation Type + Date
    R1_LBL = iy
    R1_VAL = R1_LBL + LBL_SIZE + LV_GAP
    h_r1_l = field_height(c, donation['donationType'], 'Poppins-Bold', VAL_SIZE, 140.0)
    h_r1_r = VAL_SIZE * 1.35
    iy     = R1_VAL + max(h_r1_l, h_r1_r) + ROW_GAP

    # Row 2 — Payment Mode + Prepared By
    R2_LBL = iy
    R2_VAL = R2_LBL + LBL_SIZE + LV_GAP
    h_r2_l = field_height(c, donation['mode'],  'Poppins-Bold', VAL_SIZE, 140.0)
    h_r2_r = field_height(c, donation['fills'], 'Poppins-Bold', VAL_SIZE, 155.0)
    iy     = R2_VAL + max(h_r2_l, h_r2_r)

    BOX_BOT_CONTENT = iy + BOX_PAD_IN

    # Amount box spans both rows
    AMT_TOP = R1_LBL - 4
    AMT_BOT = R2_VAL + max(h_r2_l, h_r2_r) + 6
    AMT_H   = max(AMT_BOT - AMT_TOP, 90.0)
    BAND_H  = 38.0
    WH_TOP  = AMT_TOP + BAND_H + 3
    WH_BOT  = AMT_TOP + AMT_H - 3
    WH_H    = max(WH_BOT - WH_TOP, 44.0)

    BOX_BOT = max(BOX_BOT_CONTENT, AMT_BOT + BOX_PAD_IN)

    # ── FIX 4: Always reserve room for arabic (min 35pt) + blessing + contact ──
    # Reserve: 6(gap) + 35(min arabic) + 8(gap) + 54(blessing tight) + 6(gap) + 43(FOR) = 152pt
    BOX_BOT_MAX = FOOTER_BAND_TOP - 152
    BOX_BOT     = min(BOX_BOT, BOX_BOT_MAX)

    # Enforce minimum box height (heading + 2 rows)
    MIN_BOX_H = BOX_PAD_IN + HD_SIZE + 6 + 16 + (LBL_SIZE+LV_GAP+VAL_SIZE*1.35+ROW_GAP)*2 + BOX_PAD_IN
    if BOX_BOT - BOX_TOP < MIN_BOX_H:
        BOX_TOP = max(MIN_BOX_Y, BOX_BOT - MIN_BOX_H)
        # Recompute internal positions with tighter BOX_TOP
        HD_Y    = BOX_TOP + BOX_PAD_IN
        UL3_TOP = HD_Y + HD_SIZE + 6
        iy2     = UL3_TOP + 16
        R1_LBL  = iy2
        R1_VAL  = R1_LBL + LBL_SIZE + LV_GAP
        iy2     = R1_VAL + max(h_r1_l, h_r1_r) + ROW_GAP
        R2_LBL  = iy2
        R2_VAL  = R2_LBL + LBL_SIZE + LV_GAP
        AMT_TOP = R1_LBL - 4
        AMT_BOT = R2_VAL + max(h_r2_l, h_r2_r) + 6
        AMT_H   = max(AMT_BOT - AMT_TOP, 90.0)
        WH_TOP  = AMT_TOP + BAND_H + 3
        WH_BOT  = AMT_TOP + AMT_H - 3
        WH_H    = max(WH_BOT - WH_TOP, 44.0)

    ROW_MAX_Y = BOX_BOT - BOX_PAD_IN

    # Clamp rows to stay inside box
    def clamp(v): return min(v, ROW_MAX_Y - 1)
    R1_LBL = clamp(R1_LBL); R1_VAL = clamp(R1_VAL)
    R2_LBL = clamp(R2_LBL); R2_VAL = clamp(R2_VAL)
    AMT_TOP = min(AMT_TOP, R1_LBL - 4)
    AMT_BOT = min(AMT_BOT, R2_VAL + max(h_r2_l, h_r2_r) + 6)
    AMT_H   = max(AMT_BOT - AMT_TOP, 90.0)
    WH_TOP  = AMT_TOP + BAND_H + 3
    WH_BOT  = min(AMT_TOP + AMT_H - 3, ROW_MAX_Y)
    WH_H    = max(WH_BOT - WH_TOP, 44.0)

    # Draw box background
    fi(BOX_BG); st(BOX_BG)
    c.rect(24.6, rl(BOX_BOT), 546.6, BOX_BOT-BOX_TOP, fill=1, stroke=0)

    # Heading + underline
    fi(BLUE); c.setFont('Garet-Bold', HD_SIZE)
    c.drawString(49.728, rl(HD_Y)-HD_SIZE, 'DONATION DETAILS')
    st(BLUE); c.setLineWidth(3.0)
    c.line(49.05, rl(UL3_TOP), 254.9, rl(UL3_TOP))

    # Row 1
    fi(BLACK); c.setFont('Garet-Regular', LBL_SIZE)
    c.drawString(49.728,  rl(R1_LBL)-LBL_SIZE, 'Donation Type')
    c.drawString(201.189, rl(R1_LBL)-LBL_SIZE, 'Date of Donation')
    fi(BLUE)
    draw_field(c, donation['donationType'], 'Poppins-Bold', VAL_SIZE, 49.728, R1_VAL, 140.0, H)
    c.setFont('Garet-Bold', VAL_SIZE)
    c.drawString(201.189, rl(R1_VAL)-VAL_SIZE, donation['date'])

    # Row 2
    fi(BLACK); c.setFont('Garet-Regular', LBL_SIZE)
    c.drawString(49.728,  rl(R2_LBL)-LBL_SIZE, 'Payment Mode')
    c.drawString(201.189, rl(R2_LBL)-LBL_SIZE, 'Prepared By')
    fi(BLUE)
    draw_field(c, donation['mode'],  'Poppins-Bold', VAL_SIZE, 49.728,  R2_VAL, 140.0, H)
    draw_field(c, donation['fills'], 'Poppins-Bold', VAL_SIZE, 201.189, R2_VAL, 155.0, H)

    # Amount box (extracted coords: outer top=389.0, x=364.7, w=180, h=99.8)
    fi(BLUE); st(BLUE)
    c.rect(364.7, rl(AMT_TOP+AMT_H), 180.0, AMT_H, fill=1, stroke=0)
    fi(WHITE)
    c.rect(368.3, rl(WH_BOT), 172.8, WH_H, fill=1, stroke=0)
    st(BLUE); c.setLineWidth(1.5)
    c.rect(364.4, rl(AMT_TOP+AMT_H), 180.2, AMT_H, fill=0, stroke=1)

    fi(WHITE); c.setFont('Garet-Bold', 12.110)
    lbl = 'TOTAL AMOUNT RECEIVED'
    lbl_y = AMT_TOP + BAND_H/2 + 12.110*0.35
    c.drawString(364.7 + (180.0-c.stringWidth(lbl,'Garet-Bold',12.110))/2, rl(lbl_y), lbl)

    fs      = 36.337
    amt_str = f'{int(donation["amount"]):,}'
    rupee_w = c.stringWidth('\u20B9', 'NotoSans-Bold', fs)
    num_w   = c.stringWidth(amt_str,  'Garet-Bold',    fs)
    if rupee_w + num_w > 166:
        fs = fs * 166 / (rupee_w + num_w)
    amt_y   = rl(WH_BOT) + WH_H/2 - fs*0.35
    total_w = c.stringWidth('\u20B9','NotoSans-Bold',fs) + c.stringWidth(amt_str,'Garet-Bold',fs)
    x0      = 364.7 + (180.0 - total_w) / 2
    fi(BLUE)
    c.setFont('NotoSans-Bold', fs); c.drawString(x0, amt_y, '\u20B9')
    c.setFont('Garet-Bold',    fs); c.drawString(x0+c.stringWidth('\u20B9','NotoSans-Bold',fs), amt_y, amt_str)

    # ── 11. Arabic + Blessing — dynamic, always above footer ─────────────
    # FIX 4: Arabic always drawn first (if space), blessing below it
    # BOX_BOT is already capped so there's always room
    ARABIC_H  = 69.1    # exact from sample rect: h=69.1
    ARABIC_W  = 211.9   # exact from sample rect: w=211.9
    ARABIC_X  = 191.7   # exact from sample rect: x0=191.7
    SAFE_END  = FOOTER_BAND_TOP - 4

    BL_TOTAL  = 14.030 + 16 + 13.032 + 5 + 13.032   # blessing 3 lines ≈ 61pt
    FOR_H     = 14.030 + 8 + 17.166 + 8              # FOR ANY + phone ≈ 47pt
    available = SAFE_END - BOX_BOT

    # Arabic calligraphy — always shown, height scales to fit available space
    # BOX_BOT_MAX already guarantees minimum 152pt available
    ARABIC_H_MIN = 35.0   # minimum height (still legible at this size)

    # Use tight line spacing when space is limited
    space_tight  = available < 180   # full layout needs ~200pt comfortably
    bl2_gap      = 10 if space_tight else 16   # tighter blessing line spacing
    bl3_gap      = 4  if space_tight else 5
    for_gap      = 6  if space_tight else 8    # tighter FOR ANY gap
    BL_actual    = 14.030 + bl2_gap + 13.032 + bl3_gap + 13.032
    FOR_actual   = 14.030 + for_gap + 17.166 + for_gap

    # Calculate arabic size: fill remaining space after blessing+FOR+min gaps
    MIN_GAPS    = 6 + 8 + 6   # gap_above + gap_mid + gap_for_any
    ar_h_actual = available - BL_actual - FOR_actual - MIN_GAPS
    ar_h_actual = max(ar_h_actual, ARABIC_H_MIN)
    ar_h_actual = min(ar_h_actual, ARABIC_H)   # cap at full size

    ar_w_actual = ARABIC_W * (ar_h_actual / ARABIC_H)  # keep aspect ratio
    ar_x_actual = (W - ar_w_actual) / 2                # centre horizontally

    # Distribute remaining space into gaps
    leftover  = available - ar_h_actual - BL_actual - FOR_actual
    gap_above = max(6, min(20, leftover * 0.4))
    gap_mid   = max(8, min(18, leftover * 0.35))

    AR_TOP = BOX_BOT + gap_above
    ar = os.path.join(ASSETS, 'arabic_calligraphy.png')
    if os.path.exists(ar):
        c.drawImage(ar, ar_x_actual, rl(AR_TOP+ar_h_actual),
                    width=ar_w_actual, height=ar_h_actual, mask='auto')
    BL1 = AR_TOP + ar_h_actual + gap_mid
    BL2 = BL1 + 14.030 + bl2_gap
    BL3 = BL2 + 13.032 + bl3_gap

    fi(BLUE); c.setFont('Garet-Bold', 14.030)
    t1 = '"May Allah reward you with goodness"'
    c.drawString((W-c.stringWidth(t1,'Garet-Bold',14.030))/2, rl(BL1)-14.030, t1)
    fi(BLACK); c.setFont('Garet-Regular', 13.032)
    t2 = 'Your donation is a Sadaqah.'
    c.drawString((W-c.stringWidth(t2,'Garet-Regular',13.032))/2, rl(BL2)-13.032, t2)
    t3 = 'May Allah accept it and bless you in this world and the Hereafter.'
    c.drawString((W-c.stringWidth(t3,'Garet-Regular',13.032))/2, rl(BL3)-13.032, t3)

    # ── 12. FOR ANY QUERIES + phone ──────────────────────────────────────
    FOR_Y   = BL3 + 13.032 + for_gap + 2
    PHONE_Y = FOR_Y + 14.030 + for_gap

    fi(BLUE); c.setFont('Poppins-Bold', 14.030)
    for_txt = 'FOR ANY QUERIES AND FOR 80G CERTIFICATE, KINDLY CONTACT US ON:'
    c.drawString((W-c.stringWidth(for_txt,'Poppins-Bold',14.030))/2, rl(FOR_Y)-14.030, for_txt)

    fi(BLACK); c.setFont('Poppins-Bold', 17.166)
    ph_txt = '+91 99307 39143 | +91 93225 35593'
    c.drawString((W-c.stringWidth(ph_txt,'Poppins-Bold',17.166))/2, rl(PHONE_Y)-17.166, ph_txt)

    # ── 13. Footer ───────────────────────────────────────────────────────
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