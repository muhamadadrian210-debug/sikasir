import os
from PIL import Image, ImageDraw, ImageFont

def create_cashier_logo(size=1024):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Scale factor from 512 baseline
    s = size / 512.0

    # 1. Base rounded rectangle (Squircle)
    margin = int(24 * s)
    radius = int(108 * s)
    # Emerald gradient simulation
    base_color_top = (16, 185, 129, 255) # #10B981
    draw.rounded_rectangle(
        [(margin, margin), (size - margin, size - margin)],
        radius=radius,
        fill=base_color_top
    )

    # Inner soft highlight stroke
    stroke_w = max(1, int(4 * s))
    draw.rounded_rectangle(
        [(margin + stroke_w, margin + stroke_w), (size - margin - stroke_w, size - margin - stroke_w)],
        radius=radius - stroke_w,
        outline=(255, 255, 255, 45),
        width=stroke_w
    )

    # 2. Receipt (Kertas Struk Belanja)
    rx1, ry1, rx2, ry2 = int(186 * s), int(80 * s), int(326 * s), int(210 * s)
    draw.rounded_rectangle([(rx1, ry1), (rx2, ry2)], radius=int(14 * s), fill=(255, 255, 255, 255))
    
    # Zig-zag top teeth on receipt
    teeth = 8
    tw = (rx2 - rx1) / teeth
    for i in range(teeth):
        x_left = rx1 + i * tw
        x_mid = x_left + tw / 2
        x_right = x_left + tw
        # Draw small inverted cutouts
        draw.polygon([(x_left, ry1), (x_mid, ry1 - int(8 * s)), (x_right, ry1)], fill=(16, 185, 129, 255))

    # Receipt lines (simulated text)
    draw.rounded_rectangle([(int(210 * s), int(114 * s)), (int(302 * s), int(124 * s))], radius=int(5 * s), fill=(16, 185, 129, 255))
    draw.rounded_rectangle([(int(210 * s), int(134 * s)), (int(278 * s), int(142 * s))], radius=int(4 * s), fill=(148, 163, 184, 255))
    draw.rounded_rectangle([(int(210 * s), int(150 * s)), (int(290 * s), int(158 * s))], radius=int(4 * s), fill=(148, 163, 184, 255))
    draw.rounded_rectangle([(int(210 * s), int(166 * s)), (int(260 * s), int(174 * s))], radius=int(4 * s), fill=(203, 213, 225, 255))

    # 3. Cash Register Body (Mesin Kasir Utama)
    bx1, by1, bx2, by2 = int(110 * s), int(194 * s), int(402 * s), int(368 * s)
    draw.rounded_rectangle([(bx1, by1), (bx2, by2)], radius=int(28 * s), fill=(255, 255, 255, 255))

    # Display Screen
    sx1, sy1, sx2, sy2 = int(138 * s), int(222 * s), int(276 * s), int(274 * s)
    draw.rounded_rectangle([(sx1, sy1), (sx2, sy2)], radius=int(14 * s), fill=(241, 245, 249, 255))
    # Green value indicator on screen
    draw.rounded_rectangle([(int(152 * s), int(238 * s)), (int(228 * s), int(256 * s))], radius=int(9 * s), fill=(16, 185, 129, 255))
    # Active indicator dot
    dot_r = int(7 * s)
    draw.ellipse([(int(250 * s) - dot_r, int(247 * s) - dot_r), (int(250 * s) + dot_r, int(247 * s) + dot_r)], fill=(52, 211, 153, 255))

    # Keypad Buttons
    key_r = int(11 * s)
    # Row 1
    for kx, col in [(316, (226, 232, 240)), (348, (226, 232, 240)), (376, (245, 158, 11))]:
        cx, cy = int(kx * s), int(235 * s)
        draw.ellipse([(cx - key_r, cy - key_r), (cx + key_r, cy + key_r)], fill=col)
    # Row 2
    for kx, col in [(316, (226, 232, 240)), (348, (226, 232, 240)), (376, (16, 185, 129))]:
        cx, cy = int(kx * s), int(263 * s)
        draw.ellipse([(cx - key_r, cy - key_r), (cx + key_r, cy + key_r)], fill=col)
    # Row 3 (Bottom Numpad)
    for kx in [316, 348, 376]:
        cx, cy = int(kx * s), int(291 * s)
        draw.ellipse([(cx - key_r, cy - key_r), (cx + key_r, cy + key_r)], fill=(226, 232, 240))

    # 4. Cash Drawer Base (Laci Kasir Bawah)
    dx1, dy1, dx2, dy2 = int(86 * s), int(364 * s), int(426 * s), int(418 * s)
    draw.rounded_rectangle([(dx1, dy1), (dx2, dy2)], radius=int(18 * s), fill=(255, 255, 255, 255))
    # Drawer Handle Slot
    hx1, hy1, hx2, hy2 = int(216 * s), int(384 * s), int(296 * s), int(398 * s)
    draw.rounded_rectangle([(hx1, hy1), (hx2, hy2)], radius=int(7 * s), fill=(5, 150, 105, 255))
    # Keyhole
    kr = int(5 * s)
    draw.ellipse([(int(388 * s) - kr, int(391 * s) - kr), (int(388 * s) + kr, int(391 * s) + kr)], fill=(203, 213, 225, 255))

    # 5. Golden Floating Coin Accent (Koin Rupiah Rezeki)
    coin_cx, coin_cy = int(374 * s), int(136 * s)
    coin_r = int(38 * s)
    draw.ellipse([(coin_cx - coin_r, coin_cy - coin_r), (coin_cx + coin_r, coin_cy + coin_r)], fill=(245, 158, 11, 255))
    inner_coin_r = int(28 * s)
    draw.ellipse([(coin_cx - inner_coin_r, coin_cy - inner_coin_r), (coin_cx + inner_coin_r, coin_cy + inner_coin_r)], outline=(253, 230, 138, 220), width=max(2, int(4 * s)))
    
    # Text "Rp" inside coin
    try:
        font = ImageFont.truetype("arialbd.ttf", int(30 * s))
    except Exception:
        try:
            font = ImageFont.truetype("Arial Bold.ttf", int(30 * s))
        except Exception:
            font = ImageFont.load_default()
    
    bbox = draw.textbbox((0, 0), "Rp", font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((coin_cx - tw / 2, coin_cy - th / 2 - int(2 * s)), "Rp", fill=(255, 255, 255, 255), font=font)

    # 6. Sparkle Star
    sp_cx, sp_cy = int(112 * s), int(152 * s)
    sp_r = int(14 * s)
    draw.polygon([
        (sp_cx, sp_cy - sp_r),
        (sp_cx + int(sp_r * 0.3), sp_cy - int(sp_r * 0.3)),
        (sp_cx + sp_r, sp_cy),
        (sp_cx + int(sp_r * 0.3), sp_cy + int(sp_r * 0.3)),
        (sp_cx, sp_cy + sp_r),
        (sp_cx - int(sp_r * 0.3), sp_cy + int(sp_r * 0.3)),
        (sp_cx - sp_r, sp_cy),
        (sp_cx - int(sp_r * 0.3), sp_cy - int(sp_r * 0.3))
    ], fill=(253, 230, 138, 240))

    return img

def main():
    master = create_cashier_logo(1024)

    # Public web icons
    public_icons_dir = r"c:\Users\AXIOO\Desktop\SiKasir\public\icons"
    os.makedirs(public_icons_dir, exist_ok=True)
    master.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(public_icons_dir, "logo.png"))
    master.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(public_icons_dir, "icon-512.png"))
    master.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(public_icons_dir, "icon-192.png"))
    print("Public web icons updated successfully!")

    # Android launcher icons
    android_res = r"c:\Users\AXIOO\Desktop\SiKasir\mobile_flutter\android\app\src\main\res"
    densities = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    for folder, px in densities.items():
        out_dir = os.path.join(android_res, folder)
        os.makedirs(out_dir, exist_ok=True)
        master.resize((px, px), Image.Resampling.LANCZOS).save(os.path.join(out_dir, "ic_launcher.png"))
        print(f"Android {folder}/ic_launcher.png ({px}x{px}) updated!")

if __name__ == "__main__":
    main()
