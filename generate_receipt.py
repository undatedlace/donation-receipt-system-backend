#!/usr/bin/env python3
"""
SDI Education Center — PDF Receipt Generator (final)
Usage:  python3 generate_receipt.py '<JSON>' <output_path>

Fonts strategy:
  - Agrandir / Garet subsets  → fixed hardcoded labels only (chars guaranteed in subset)
  - Poppins full fonts         → all user-data fields (donor name, address, etc.)
  - NotoSans-Bold              → ₹ rupee symbol only
"""
import sys, os, json, math
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

BASE   = os.path.dirname(os.path.abspath(__file__))
FONTS  = os.path.join(BASE, 'fonts')
ASSETS = os.path.join(BASE, 'assets')
K      = 0.5523


def register_fonts():
    # Subset fonts (fixed labels only — original receipt chars)
    for name, fname in [
        ('Garet-Bold',          'Garet-Bold.ttf'),
        ('Garet-Regular',       'Garet-Regular.ttf'),
        ('Garet-RegularItalic', 'Garet-RegularItalic.ttf'),
        ('Garet-BoldItalic',    'Garet-BoldItalic.ttf'),
        ('Agrandir-WideBold',   'Agrandir-WideBold.ttf'),
        ('Agrandir-WideHeavy',  'Agrandir-WideHeavy.ttf'),
        ('NotoSans-Bold',       'NotoSans-Bold.ttf'),
    ]:
        path = os.path.join(FONTS, fname)
        if not os.path.exists(path):
            raise FileNotFoundError(f'Font missing: {path}')
        pdfmetrics.registerFont(TTFont(name, path))

    # Full Poppins fonts for user-entered data (all Latin glyphs available)
    poppins_map = [
        ('Poppins-Bold',       'Poppins-Bold.ttf'),
        ('Poppins-Regular',    'Poppins-Regular.ttf'),
        ('Poppins-Italic',     'Poppins-Italic.ttf'),
        ('Poppins-BoldItalic', 'Poppins-BoldItalic.ttf'),
    ]
    for name, fname in poppins_map:
        # Try fonts/ folder first, then system paths
        candidates = [
            os.path.join(FONTS, fname),
            f'/usr/share/fonts/truetype/google-fonts/{fname}',
            f'/usr/share/fonts/truetype/ttf-bitstream-vera/{fname}',
            f'/Library/Fonts/{fname}',
            f'/System/Library/Fonts/{fname}',
        ]
        for path in candidates:
            if os.path.exists(path):
                pdfmetrics.registerFont(TTFont(name, path))
                break
        else:
            # Fallback: use Garet-Bold/Regular if Poppins not found
            fallback = 'Garet-Bold' if 'Bold' in name else 'Garet-Regular'
            pdfmetrics.registerFont(pdfmetrics.getFont(fallback))


def wrap_text(c, text, font, size, max_width):
    """Split text into lines that fit within max_width. Returns list of lines."""
    words  = str(text).split()
    lines  = []
    current = ''
    for word in words:
        test = f'{current} {word}'.strip()
        if c.stringWidth(test, font, size) <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines if lines else ['']


def draw_wrapped(c, text, font, size, x, y, max_width, line_height=None):
    """Draw text with word-wrap. Returns y position after last line."""
    if line_height is None:
        line_height = size * 1.3
    lines = wrap_text(c, text, font, size, max_width)
    for line in lines:
        c.setFont(font, size)
        c.drawString(x, y, line)
        y -= line_height
    return y


def draw_logo_badge(c, rect_x, y_bottom, width, height, W):
    r=height/2; y_mid=y_bottom+r; y_top=y_bottom+height
    p=c.beginPath()
    p.moveTo(rect_x,y_top); p.lineTo(W,y_top); p.lineTo(W,y_bottom); p.lineTo(rect_x,y_bottom)
    p.curveTo(rect_x-r*K,y_bottom, rect_x-r,y_mid-r*K, rect_x-r,y_mid)
    p.curveTo(rect_x-r,y_mid+r*K, rect_x-r*K,y_top, rect_x,y_top)
    p.close(); c.drawPath(p,fill=1,stroke=0)


def build_pdf(donation: dict, out_path: str):
    W,H = 595.5, 842.25

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
    rl = lambda top: H - top

    # ── 0. Page background ───────────────────────────────────────────────
    fi(GREY_BG); st(GREY_BG); c.rect(0,0,W,H,fill=1,stroke=0)

    # ── 1. Watermark ─────────────────────────────────────────────────────
    bg = os.path.join(ASSETS,'bg_watermark.png')
    if os.path.exists(bg):
        c.drawImage(bg,-9.0,rl(-125.1)-1076.7,width=613.7,height=1076.7,mask='auto')

    # ── 2. Header base (grey) ─────────────────────────────────────────────
    fi(GREY_BG); st(GREY_BG); c.rect(-14,rl(92.0),623.3,139.7,fill=1,stroke=0)

    # Wave 1 — mid blue
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

    # Wave 2 — light blue
    fi(WAVE_LITE); p=c.beginPath()
    p.moveTo(27.819,rl(-27.251))
    p.curveTo(89.017,rl(-5.081),211.483,rl(30.871),354.193,rl(27.138))
    p.curveTo(317.468,rl(31.521),278.160,rl(33.739),237.227,rl(32.452))
    p.curveTo(203.897,rl(31.404),174.794,rl(29.777),149.410,rl(27.786))
    p.curveTo(17.283,rl(17.419),-13.890,rl(-2.843),-13.890,rl(-2.843))
    p.lineTo(-13.890,rl(-43.958))
    p.curveTo(-13.890,rl(-43.958),1.149,rl(-36.913),27.819,rl(-27.251))
    p.close(); c.drawPath(p,fill=1,stroke=0)

    # Wave 3 — main blue
    fi(BLUE); p=c.beginPath()
    p.moveTo(609.410,rl(-48.135)); p.lineTo(609.410,rl(-12.451))
    p.curveTo(609.410,rl(-12.451),565.115,rl(16.345),358.293,rl(22.846))
    p.curveTo(356.924,rl(22.889),355.558,rl(22.926),354.194,rl(22.962))
    p.curveTo(211.484,rl(26.695),89.019,rl(-9.257),27.820,rl(-31.427))
    p.curveTo(1.149,rl(-41.090),-13.891,rl(-48.135),-13.891,rl(-48.135))
    p.lineTo(609.410,rl(-48.135)); p.close(); c.drawPath(p,fill=1,stroke=0)

    # ── 3. Footer blue band ───────────────────────────────────────────────
    fi(BLUE); st(BLUE); c.rect(-14,rl(884.4),623.7,131.5,fill=1,stroke=0)

    # ── 4. Logo badge ─────────────────────────────────────────────────────
    logo_x=463.4; logo_top=175.2; logo_h=83.3
    logo_r=logo_h/2; logo_cx=logo_x+logo_r
    badge_rect_x=logo_cx
    fi(BLUE)
    draw_logo_badge(c,rect_x=badge_rect_x,y_bottom=rl(logo_top+logo_h),
                    width=W-badge_rect_x,height=logo_h,W=W)
    logo_img=os.path.join(ASSETS,'logo_circle.png')
    if os.path.exists(logo_img):
        c.drawImage(logo_img,logo_x,rl(logo_top+logo_h),width=logo_h,height=logo_h,mask='auto')

    # ── 5. Org name & regd (fixed text — Agrandir subset ok) ─────────────
    fi(BLACK); c.setFont('Agrandir-WideHeavy',30.011)
    c.drawString(55.977,rl(95.198)-30.011,'SDI EDUCATION CENTER')
    fi(BLUE); c.setFont('Garet-Bold',11.029)
    c.drawString(419.623,rl(126.977)-11.029,'REGD NO.: E-32359')

    # ── 6. Title (fixed text) ─────────────────────────────────────────────
    fi(BLACK); c.setFont('Agrandir-WideBold',20.003)
    c.drawString(170.800,rl(153.223)-20.003,'DONATION RECEIPT')
    st(DARK_LINE); c.setLineWidth(3.0); c.line(168.7,rl(177.5),426.8,rl(177.5))
    fi(BLUE); c.setFont('Garet-Bold',14.000)
    c.drawString(171.581,rl(184.705)-14.000,
                 f'RECEIPT NUMBER: {donation["receiptNumber"]}')

    # ── 7. Donor Information ──────────────────────────────────────────────
    # Section heading (fixed text — Garet subset ok)
    fi(BLUE); c.setFont('Garet-Bold',20.003)
    c.drawString(47.161,rl(227.851)-20.003,'DONOR INFORMATION')
    st(BLUE); c.setLineWidth(3.0); c.line(47.161,rl(250.1),281.0,rl(250.1))

    # "Full Name:" label (fixed)
    fi(BLACK); c.setFont('Garet-Regular',13.032)
    c.drawString(47.161,rl(266.749)-13.032,'Full Name:')

    # Donor name VALUE — Poppins-Bold, wrapped, max width up to logo edge
    fi(BLUE)
    draw_wrapped(c, donation['donorName'], 'Poppins-Bold', 14.0,
                 47.161, rl(281.980)-14.0, max_width=380.0)

    # Phone / Address labels (fixed)
    fi(BLACK); c.setFont('Garet-Regular',13.032)
    c.drawString(47.161,rl(312.477)-13.032,'Phone Number:')
    c.drawString(384.540,rl(313.367)-13.032,'Address:')

    # Phone VALUE — Poppins-Bold (digits always work in Garet, but use Poppins for safety)
    fi(BLUE); c.setFont('Poppins-Bold',14.0)
    c.drawString(47.161,rl(327.638)-14.0,f'+91 {donation["mobileNumber"]}')

    # Address VALUE — Poppins-Bold, wrapped
    fi(BLUE)
    draw_wrapped(c, donation['address'], 'Poppins-Bold', 14.0,
                 384.540, rl(328.598)-14.0, max_width=160.0)

    # ── 8. Donation Details box ───────────────────────────────────────────
    fi(BOX_BG); st(BOX_BG); c.rect(24.6,rl(529.8),546.6,164.6,fill=1,stroke=0)

    # Section heading (fixed)
    fi(BLUE); c.setFont('Garet-Bold',20.003)
    c.drawString(49.728,rl(385.165)-20.003,'DONATION DETAILS')
    st(BLUE); c.setLineWidth(3.0); c.line(49.0,rl(407.6),255.0,rl(407.6))

    # Labels (fixed)
    fi(BLACK); c.setFont('Garet-Regular',13.032)
    c.drawString(49.728, rl(424.447)-13.032,'Donation Type')
    c.drawString(201.189,rl(424.447)-13.032,'Date of Donation')

    # Donation type VALUE — Poppins-Bold (user data, could be any string)
    fi(BLUE)
    draw_wrapped(c, donation['donationType'], 'Poppins-Bold', 14.0,
                 49.728, rl(439.678)-14.0, max_width=140.0)

    # Date VALUE — Garet-Bold (digits + / only, always in subset)
    fi(BLUE); c.setFont('Garet-Bold',14.030)
    c.drawString(201.189,rl(439.678)-14.030, donation['date'])

    # More labels (fixed)
    fi(BLACK); c.setFont('Garet-Regular',13.032)
    c.drawString(49.728, rl(474.354)-13.032,'Payment Mode')
    c.drawString(201.189,rl(474.354)-13.032,'Prepared By')

    # Mode VALUE — Poppins-Bold
    fi(BLUE)
    draw_wrapped(c, donation['mode'], 'Poppins-Bold', 14.0,
                 49.728, rl(489.586)-14.0, max_width=140.0)

    # Prepared By VALUE — Poppins-Bold, wrapped, constrained width (avoid amount box)
    fi(BLUE)
    draw_wrapped(c, donation['fills'], 'Poppins-Bold', 14.0,
                 201.189, rl(489.586)-14.0, max_width=155.0)

    # ── 9. Amount box ─────────────────────────────────────────────────────
    fi(BLUE); st(BLUE); c.rect(373.4,rl(515.8),180.0,99.8,fill=1,stroke=0)
    fi(WHITE); c.rect(377.0,rl(512.2),172.8,58.7,fill=1,stroke=0)
    st(BLUE); c.setLineWidth(1.5); c.rect(373.4,rl(515.8),180.0,99.8,fill=0,stroke=1)

    fi(WHITE); c.setFont('Garet-Bold',12.110)
    lbl='TOTAL AMOUNT RECEIVED'
    c.drawString(373.4+(180.0-c.stringWidth(lbl,'Garet-Bold',12.110))/2,
                 rl(430.519)-12.110, lbl)

    fs=36.337; amt_y=rl(512.2)+(58.7-fs)/2-6
    fi(BLUE); c.setFont('NotoSans-Bold',fs); c.drawString(394.012,amt_y,'\u20B9')
    c.setFont('Garet-Bold',fs)
    c.drawString(414.797,amt_y,f'{int(donation["amount"]):,}')

    # ── 10. Arabic calligraphy ────────────────────────────────────────────
    ar=os.path.join(ASSETS,'arabic_calligraphy.png')
    if os.path.exists(ar):
        c.drawImage(ar,178.6,rl(577.9)-77.7,width=238.1,height=77.7,mask='auto')

    # ── 11. Blessing text (fixed) ─────────────────────────────────────────
    fi(BLUE); c.setFont('Garet-Bold',14.030)
    t1='"May Allah reward you with goodness"'
    c.drawString((W-c.stringWidth(t1,'Garet-Bold',14.030))/2,rl(670.172)-14.030,t1)
    fi(BLACK); c.setFont('Garet-Regular',13.032)
    t2='Your donation is a Sadaqah.'
    c.drawString((W-c.stringWidth(t2,'Garet-Regular',13.032))/2,rl(698.845)-13.032,t2)
    t3='May Allah accept it and bless you in this world and the Hereafter.'
    c.drawString((W-c.stringWidth(t3,'Garet-Regular',13.032))/2,rl(716.852)-13.032,t3)

    # ── 12. Footer ────────────────────────────────────────────────────────
    # Use Poppins-Italic for footer — contains digits/all chars unlike Garet subset
    fi(WHITE); c.setFont('Poppins-Italic',10.031)
    ft1='This is an official receipt for your donation records. Please retain for your reference.'
    c.drawString((W-c.stringWidth(ft1,'Poppins-Italic',10.031))/2,rl(768.673)-10.031,ft1)
    ft2=f'Generated: {donation.get("generatedAt","")} | Receipt: {donation["receiptNumber"]}'
    c.drawString((W-c.stringWidth(ft2,'Poppins-Italic',10.031))/2,rl(784.429)-10.031,ft2)
    c.setFont('Poppins-BoldItalic',10.031)
    c.drawString(41.619, rl(809.669)-10.031,'• SDI EDUCATION CENTER')
    c.drawString(450.369,rl(809.669)-10.031,'• AUTHORIZED RECEIPT')

    c.save()


def main():
    if len(sys.argv)<3:
        print("Usage: python3 generate_receipt.py '<JSON>' <output_path>",file=sys.stderr)
        sys.exit(1)
    register_fonts()
    build_pdf(json.loads(sys.argv[1]), sys.argv[2])
    print(f'OK:{sys.argv[2]}')

if __name__=='__main__': main()