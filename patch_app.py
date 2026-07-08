with open('public/app.html', 'r', encoding='utf-8') as f:
    html = f.read()

zxing_script = '<script src="https://cdn.jsdelivr.net/npm/@zxing/library@0.20.0/umd/index.min.js"></script>'
html5_script = '<script src="https://unpkg.com/html5-qrcode" type="text/javascript"></script>'

html = html.replace(zxing_script, html5_script)

with open('public/app.html', 'w', encoding='utf-8') as f:
    f.write(html)
