#!/usr/bin/env python3
"""
SDI Education Center — Exact PDF Receipt Generator (final)
===========================================================
Usage:
  python3 generate_receipt.py '<JSON_STRING>' <output_path>

JSON fields:
  receiptNumber, donorName, mobileNumber, address,
  donationType, mode, date, fills, amount, generatedAt

Assets (relative to this script):
  assets/bg_watermark.png
  assets/arabic_calligraphy.png
  assets/logo_circle.png        ← SDI logo, circle-clipped PNG

Fonts (relative to this script):
  fonts/Garet-Bold.ttf
  fonts/Garet-Regular.ttf
  fonts/Garet-RegularItalic.ttf
  fonts/Garet-BoldItalic.ttf
  fonts/Agrandir-WideBold.ttf
  fonts/Agrandir-WideHeavy.ttf
  fonts/NotoSans-Bold.ttf
"""

import sys, os, json, math
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

BASE   = os.path.dirname(os.path.abspath(__file__))
FONTS  = os.path.join(BASE, 'fonts')
ASSETS = os.path.join(BASE, 'assets')

K = 0.5523   # bezier quarter-circle approximation constant


def register_fonts():
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


def draw_logo_badge(c, rect_x, y_bottom, width, height, W):
    """
    Draw the SDI logo badge:
      - Rectangle from rect_x → page right edge (W), height = height
      - Left side: a perfect semicircle that BULGES LEFT from rect_x
        (center at rect_x, radius = height/2)
      - Right side: flush with page right edge
    This means the leftmost point of the shape is at rect_x - height/2.
    The logo circle should be centered at (rect_x + height/2, y_bottom + height/2).
    """
    r     = height / 2
    y_mid = y_bottom + r
    y_top = y_bottom + height

    p = c.beginPath()
    p.moveTo(rect_x,        y_top)          # top of left edge (start of bulge)
    p.lineTo(W,             y_top)          # top edge to right
    p.lineTo(W,             y_bottom)       # right edge down
    p.lineTo(rect_x,        y_bottom)       # bottom edge back to rect_x
    # Bottom-left quarter circle: rect_x,y_bot → rect_x-r,y_mid
    p.curveTo(rect_x - r*K, y_bottom,
              rect_x - r,   y_mid - r*K,
              rect_x - r,   y_mid)
    # Top-left quarter circle: rect_x-r,y_mid → rect_x,y_top
    p.curveTo(rect_x - r,   y_mid + r*K,
              rect_x - r*K, y_top,
              rect_x,       y_top)
    p.close()
    c.drawPath(p, fill=1, stroke=0)


def build_pdf(donation: dict, out_path: str):
    W, H = 595.5, 842.25

    # ── Colors (exact from pdfplumber) ────────────────────────────────────
    BLUE      = (0.0784, 0.2549, 0.5098)   # #134081
    BLACK     = (0.0,    0.0,    0.0)
    WHITE     = (1.0,    1.0,    1.0)
    GREY_BG   = (0.9216, 0.9216, 0.9216)   # page body + header background
    BOX_BG    = (0.9804, 0.9804, 0.9804)   # donation details box
    DARK_LINE = (0.2196, 0.2196, 0.2196)
    WAVE_LITE = (0.5333, 0.6863, 0.8667)
    WAVE_MID  = (0.2784, 0.4627, 0.7255)

    c = rl_canvas.Canvas(out_path, pagesize=(W, H))
    def fi(col): c.setFillColorRGB(*col)
    def st(col): c.setStrokeColorRGB(*col)
    def rl(top): return H - top             # pdfplumber top → RL y

    # ── 0. PAGE BACKGROUND ────────────────────────────────────────────────
    fi(GREY_BG); st(GREY_BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # ── 1. BACKGROUND WATERMARK ───────────────────────────────────────────
    bg = os.path.join(ASSETS, 'bg_watermark.png')
    if os.path.exists(bg):
        c.drawImage(bg, -9.0, rl(-125.1) - 1076.7,
                    width=613.7, height=1076.7, mask='auto')

    # ── 2. HEADER BASE — same grey as page body ───────────────────────────
    fi(GREY_BG); st(GREY_BG)
    c.rect(-14, rl(92.0), 623.3, 139.7, fill=1, stroke=0)

    # Wave 1 — mid blue
    fi(WAVE_MID)
    p = c.beginPath()
    p.moveTo(354.193, rl(31.315))
    p.curveTo(355.558, rl(31.279), 356.923, rl(31.242), 358.291, rl(31.199))
    p.curveTo(565.115, rl(24.699), 609.410, rl(-4.098),  609.410, rl(-4.098))
    p.lineTo( 609.410, rl(91.423))
    p.curveTo(609.410, rl(91.423), 565.115, rl(46.834), 358.293, rl(53.336))
    p.curveTo(280.633, rl(55.776), 208.819, rl(45.610), 149.410, rl(31.961))
    p.curveTo(174.794, rl(33.953), 203.897, rl(35.580), 237.227, rl(36.627))
    p.curveTo(278.162, rl(37.913), 317.469, rl(35.696), 354.193, rl(31.313))
    p.lineTo(354.193, rl(31.315))
    p.close()
    c.drawPath(p, fill=1, stroke=0)

    # Wave 2 — lighter blue
    fi(WAVE_LITE)
    p = c.beginPath()
    p.moveTo( 27.819, rl(-27.251))
    p.curveTo( 89.017, rl(-5.081),  211.483, rl(30.871), 354.193, rl(27.138))
    p.curveTo(317.468, rl(31.521),  278.160, rl(33.739), 237.227, rl(32.452))
    p.curveTo(203.897, rl(31.404),  174.794, rl(29.777), 149.410, rl(27.786))
    p.curveTo( 17.283, rl(17.419),  -13.890, rl(-2.843), -13.890, rl(-2.843))
    p.lineTo( -13.890, rl(-43.958))
    p.curveTo( -13.890, rl(-43.958),   1.149, rl(-36.913),  27.819, rl(-27.251))
    p.close()
    c.drawPath(p, fill=1, stroke=0)

    # Wave 3 — main blue #134081
    fi(BLUE)
    p = c.beginPath()
    p.moveTo( 609.410, rl(-48.135))
    p.lineTo( 609.410, rl(-12.451))
    p.curveTo(609.410, rl(-12.451), 565.115, rl(16.345), 358.293, rl(22.846))
    p.curveTo(356.924, rl(22.889),  355.558, rl(22.926), 354.194, rl(22.962))
    p.curveTo(211.484, rl(26.695),   89.019, rl(-9.257),  27.820, rl(-31.427))
    p.curveTo(  1.149, rl(-41.090), -13.891, rl(-48.135), -13.891, rl(-48.135))
    p.lineTo( 609.410, rl(-48.135))
    p.close()
    c.drawPath(p, fill=1, stroke=0)

    # ── 3. FOOTER BLUE BAND ───────────────────────────────────────────────
    fi(BLUE); st(BLUE)
    c.rect(-14, rl(884.4), 623.7, 131.5, fill=1, stroke=0)

    # ── 4. LOGO BADGE ─────────────────────────────────────────────────────
    # badge_rect_x = where the blue rectangle starts (right of semicircle centre).
    # The semicircle bulges LEFT from badge_rect_x with radius = logo_r.
    # Setting badge_rect_x = logo_cx (= logo_x + logo_r = 505.05) makes the
    # semicircle tip sit exactly at logo_x (463.4) — hugging the logo circle.
    logo_x        = 463.4
    logo_top      = 175.2
    logo_h        = 83.3
    logo_r        = logo_h / 2          # 41.65
    logo_cx       = logo_x + logo_r    # 505.05
    badge_rect_x  = logo_cx            # semicircle hugs the logo edge

    fi(BLUE)
    draw_logo_badge(
        c,
        rect_x   = badge_rect_x,
        y_bottom = rl(logo_top + logo_h),
        width    = W - badge_rect_x,
        height   = logo_h,
        W        = W,
    )

    logo_img = os.path.join(ASSETS, 'logo_circle.png')
    if os.path.exists(logo_img):
        c.drawImage(logo_img, logo_x, rl(logo_top + logo_h),
                    width=logo_h, height=logo_h, mask='auto')

    # ── 5. ORG NAME & REGD ────────────────────────────────────────────────
    fi(BLACK)
    c.setFont('Agrandir-WideHeavy', 30.011)
    c.drawString(55.977, rl(95.198) - 30.011, 'SDI EDUCATION CENTER')

    fi(BLUE)
    c.setFont('Garet-Bold', 11.029)
    c.drawString(419.623, rl(126.977) - 11.029, 'REGD NO.: E-32359')

    # ── 6. DONATION RECEIPT TITLE ─────────────────────────────────────────
    fi(BLACK)
    c.setFont('Agrandir-WideBold', 20.003)
    c.drawString(170.800, rl(153.223) - 20.003, 'DONATION RECEIPT')

    st(DARK_LINE); c.setLineWidth(3.0)
    c.line(168.7, rl(177.5), 426.8, rl(177.5))

    fi(BLUE)
    c.setFont('Garet-Bold', 14.000)
    c.drawString(171.581, rl(184.705) - 14.000,
                 f'RECEIPT NUMBER: {donation["receiptNumber"]}')

    # ── 7. DONOR INFORMATION ──────────────────────────────────────────────
    fi(BLUE)
    c.setFont('Garet-Bold', 20.003)
    c.drawString(47.161, rl(227.851) - 20.003, 'DONOR INFORMATION')

    st(BLUE); c.setLineWidth(3.0)
    c.line(47.161, rl(250.1), 281.0, rl(250.1))

    fi(BLACK)
    c.setFont('Garet-Regular', 13.032)
    c.drawString(47.161, rl(266.749) - 13.032, 'Full Name:')

    fi(BLUE)
    c.setFont('Garet-Bold', 14.030)
    c.drawString(47.161, rl(281.980) - 14.030, donation['donorName'])

    fi(BLACK)
    c.setFont('Garet-Regular', 13.032)
    c.drawString(47.161,  rl(312.477) - 13.032, 'Phone Number:')
    c.drawString(384.540, rl(313.367) - 13.032, 'Address:')

    fi(BLUE)
    c.setFont('Garet-Bold', 14.030)
    c.drawString(47.161,  rl(327.638) - 14.030, f'+91 {donation["mobileNumber"]}')
    c.drawString(384.540, rl(328.598) - 14.030, donation['address'])

    # ── 8. DONATION DETAILS BOX ───────────────────────────────────────────
    fi(BOX_BG); st(BOX_BG)
    c.rect(24.6, rl(529.8), 546.6, 164.6, fill=1, stroke=0)

    fi(BLUE)
    c.setFont('Garet-Bold', 20.003)
    c.drawString(49.728, rl(385.165) - 20.003, 'DONATION DETAILS')

    st(BLUE); c.setLineWidth(3.0)
    c.line(49.0, rl(407.6), 255.0, rl(407.6))

    fi(BLACK)
    c.setFont('Garet-Regular', 13.032)
    c.drawString(49.728,  rl(424.447) - 13.032, 'Donation Type')
    c.drawString(201.189, rl(424.447) - 13.032, 'Date of Donation')

    fi(BLUE)
    c.setFont('Garet-Bold', 14.030)
    c.drawString(49.728,  rl(439.678) - 14.030, donation['donationType'])
    c.drawString(201.189, rl(439.678) - 14.030, donation['date'])

    fi(BLACK)
    c.setFont('Garet-Regular', 13.032)
    c.drawString(49.728,  rl(474.354) - 13.032, 'Payment Mode')
    c.drawString(201.189, rl(474.354) - 13.032, 'Prepared By')

    fi(BLUE)
    c.setFont('Garet-Bold', 14.030)
    c.drawString(49.728,  rl(489.586) - 14.030, donation['mode'])
    c.drawString(201.189, rl(489.586) - 14.030, donation['fills'])

    # ── 9. AMOUNT BOX ─────────────────────────────────────────────────────
    fi(BLUE); st(BLUE)
    c.rect(373.4, rl(515.8), 180.0, 99.8, fill=1, stroke=0)
    fi(WHITE)
    c.rect(377.0, rl(512.2), 172.8, 58.7, fill=1, stroke=0)
    st(BLUE); c.setLineWidth(1.5)
    c.rect(373.4, rl(515.8), 180.0, 99.8, fill=0, stroke=1)

    fi(WHITE)
    c.setFont('Garet-Bold', 12.110)
    label = 'TOTAL AMOUNT RECEIVED'
    lw    = c.stringWidth(label, 'Garet-Bold', 12.110)
    c.drawString(373.4 + (180.0 - lw) / 2, rl(430.519) - 12.110, label)

    panel_bottom = rl(512.2)
    panel_h      = 58.7
    font_size    = 36.337
    amount_y     = panel_bottom + (panel_h - font_size) / 2 - 6

    fi(BLUE)
    c.setFont('NotoSans-Bold', font_size)
    c.drawString(394.012, amount_y, '\u20B9')
    c.setFont('Garet-Bold', font_size)
    c.drawString(414.797, amount_y, f'{int(donation["amount"]):,}')

    # ── 10. ARABIC CALLIGRAPHY ────────────────────────────────────────────
    arabic = os.path.join(ASSETS, 'arabic_calligraphy.png')
    if os.path.exists(arabic):
        c.drawImage(arabic, 178.6, rl(577.9) - 77.7,
                    width=238.1, height=77.7, mask='auto')

    # ── 11. BLESSING TEXT ─────────────────────────────────────────────────
    fi(BLUE)
    c.setFont('Garet-Bold', 14.030)
    t1 = '"May Allah reward you with goodness"'
    c.drawString((W - c.stringWidth(t1, 'Garet-Bold', 14.030)) / 2,
                 rl(670.172) - 14.030, t1)

    fi(BLACK)
    c.setFont('Garet-Regular', 13.032)
    t2 = 'Your donation is a Sadaqah.'
    c.drawString((W - c.stringWidth(t2, 'Garet-Regular', 13.032)) / 2,
                 rl(698.845) - 13.032, t2)
    t3 = 'May Allah accept it and bless you in this world and the Hereafter.'
    c.drawString((W - c.stringWidth(t3, 'Garet-Regular', 13.032)) / 2,
                 rl(716.852) - 13.032, t3)

    # ── 12. FOOTER ────────────────────────────────────────────────────────
    fi(WHITE)
    c.setFont('Garet-RegularItalic', 10.031)
    ft1 = 'This is an official receipt for your donation records. Please retain for your reference.'
    c.drawString((W - c.stringWidth(ft1, 'Garet-RegularItalic', 10.031)) / 2,
                 rl(768.673) - 10.031, ft1)
    ft2 = f'Generated: {donation.get("generatedAt", "")} | Receipt: {donation["receiptNumber"]}'
    c.drawString((W - c.stringWidth(ft2, 'Garet-RegularItalic', 10.031)) / 2,
                 rl(784.429) - 10.031, ft2)

    c.setFont('Garet-BoldItalic', 10.031)
    c.drawString(41.619,  rl(809.669) - 10.031, '• SDI EDUCATION CENTER')
    c.drawString(450.369, rl(809.669) - 10.031, '• AUTHORIZED RECEIPT')

    c.save()


def main():
    if len(sys.argv) < 3:
        print('Usage: python3 generate_receipt.py \'<JSON>\' <output_path>',
              file=sys.stderr)
        sys.exit(1)
    donation = json.loads(sys.argv[1])
    out_path  = sys.argv[2]
    register_fonts()
    build_pdf(donation, out_path)
    print(f'OK:{out_path}')


if __name__ == '__main__':
    main()