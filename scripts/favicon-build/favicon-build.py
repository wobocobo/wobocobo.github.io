"""
Regenera los favicons del sitio a partir del artwork original.

Por que existe: Google saca el favicon de la ruta /favicon.ico de la raiz y lo
pinta sobre fondo blanco (la SERP), asi que ese archivo tiene que ser el de la
variante NEGRA. Ademas Google pide un tamano multiplo de 48px, asi que los .ico
se generan con frames 16/32/48/256 en vez de un unico frame de 256px.

Uso:  py -3 scripts/favicon-build/favicon-build.py   (desde la raiz del repo)

Solo necesita la stdlib de Python. El artwork de 256px se recupera del frame
PNG de los .ico de origen, sin recomprimir ni redibujar, asi que el diseno no
cambia. Los tres destinos leen de si mismos o de `faviconBlack.ico`, nunca entre
si, asi que el script es idempotente: se puede volver a ejecutar cuando se
cambie el diseno.
"""

import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SIZES = (16, 32, 48, 256)

# destino -> de donde saca su artwork de 256px. Ningun destino se lee a si
# mismo antes de ser escrito, asi que da igual el orden de ejecucion.
SOURCES = {
    "favicon.ico": "faviconBlack.ico",
    "faviconBlack.ico": "faviconBlack.ico",
    "faviconWhite.ico": "faviconWhite.ico",
}

# apple-touch-icon: 180x180 PNG opaco. iOS ignora el alfa (lo pinta negro) y
# aplica su propia mascara de esquinas, asi que va a sangre completa sobre el
# fondo oscuro del tema por defecto (--bg-deep) con el glifo blanco encima.
TOUCH_SIZE = 180
TOUCH_BG = (0x05, 0x08, 0x0F)
TOUCH_DEST = "apple-touch-icon.png"
TOUCH_SOURCE = "faviconWhite.ico"


# --------------------------------------------------------------------------- #
# PNG (decodificador minimo: 8 bits, truecolor con o sin alfa, sin entrelazado)
# --------------------------------------------------------------------------- #

def decode_png(data):
    pos = 8
    idat = b""
    width = height = depth = color = None
    while pos < len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        ctype = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + length]
        if ctype == b"IHDR":
            width, height, depth, color = struct.unpack(">IIBB", chunk[:10])
        elif ctype == b"IDAT":
            idat += chunk
        pos += 12 + length

    if depth != 8 or color not in (2, 6):
        raise ValueError("PNG no soportado: depth=%s color=%s" % (depth, color))

    nch = 4 if color == 6 else 3
    raw = zlib.decompress(idat)
    stride = width * nch
    out = bytearray()
    prev = bytearray(stride)
    p = 0
    for _ in range(height):
        ftype = raw[p]
        p += 1
        line = bytearray(raw[p:p + stride])
        p += stride
        if ftype == 1:
            for i in range(nch, stride):
                line[i] = (line[i] + line[i - nch]) & 255
        elif ftype == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 255
        elif ftype == 3:
            for i in range(stride):
                a = line[i - nch] if i >= nch else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif ftype == 4:
            for i in range(stride):
                a = line[i - nch] if i >= nch else 0
                b = prev[i]
                c = prev[i - nch] if i >= nch else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                pred = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pred) & 255
        out += line
        prev = line

    if nch == 4:
        return width, height, bytes(out)

    rgba = bytearray(width * height * 4)
    for i in range(width * height):
        rgba[i * 4:i * 4 + 3] = out[i * 3:i * 3 + 3]
        rgba[i * 4 + 3] = 255
    return width, height, bytes(rgba)


def encode_png(size, rgba):
    """Reempaqueta RGBA como PNG (usado por el frame de 256).

    Aplica el filtro adaptativo estandar de la spec (el de menor suma de
    diferencias absolutas, fila a fila). Sin esto el filtro None (0) deja el
    PNG un 30% mas grande, porque las filas del glifo son practicamente
    horizontales y el filtro Up las aplana casi por completo.
    """
    stride = size * 4
    raw = bytearray()
    prev = bytearray(stride)
    for y in range(size):
        line = rgba[y * stride:(y + 1) * stride]
        best = None
        for ftype in range(5):
            cand = apply_filter(ftype, line, prev, 4)
            score = sum(b if b < 128 else 256 - b for b in cand)
            if best is None or score < best[0]:
                best = (score, ftype, cand)
        raw.append(best[1])
        raw += best[2]
        prev = line

    def chunk(tag, payload):
        return (
            struct.pack(">I", len(payload))
            + tag
            + payload
            + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
        )

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )


def apply_filter(ftype, line, prev, bpp):
    """Los 5 filtros de fila de PNG, sobre una fila RGBA de 4 bytes/px."""
    out = bytearray(len(line))
    for i in range(len(line)):
        a = line[i - bpp] if i >= bpp else 0
        b = prev[i]
        c = prev[i - bpp] if i >= bpp else 0
        if ftype == 0:
            val = line[i]
        elif ftype == 1:
            val = line[i] - a
        elif ftype == 2:
            val = line[i] - b
        elif ftype == 3:
            val = line[i] - ((a + b) >> 1)
        else:
            p = a + b - c
            pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
            pred = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
            val = line[i] - pred
        out[i] = val & 255
    return out


def read_ico_png(path):
    """Extrae el ultimo frame de un .ico y lo decodifica a RGBA."""
    with open(path, "rb") as fh:
        data = fh.read()
    if data[:4] != b"\x00\x00\x01\x00":
        raise ValueError("%s no es un .ico valido" % path)
    count = struct.unpack("<H", data[4:6])[0]
    entry = 6 + 16 * (count - 1)
    size, offset = struct.unpack("<II", data[entry + 8:entry + 16])
    payload = data[offset:offset + size]
    if payload[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("%s: el frame %d no es un PNG (es DIB)" % (path, count - 1))
    return decode_png(payload)


# --------------------------------------------------------------------------- #
# Escalado por area con alfa premultiplicado (evita halos oscuros al encoger)
# --------------------------------------------------------------------------- #

def downscale(size, rgba, target):
    if target == size:
        return rgba

    cells = [[0.0, 0.0, 0.0, 0.0, 0.0] for _ in range(target * target)]

    for y in range(size):
        ty = y * target // size
        row = y * size * 4
        for x in range(size):
            i = row + x * 4
            cell = cells[ty * target + (x * target // size)]
            a = rgba[i + 3]
            cell[0] += rgba[i] * a
            cell[1] += rgba[i + 1] * a
            cell[2] += rgba[i + 2] * a
            cell[3] += a
            cell[4] += 1

    out = bytearray(target * target * 4)
    for n, cell in enumerate(cells):
        count = cell[4]
        alpha = cell[3] / count
        o = n * 4
        if alpha <= 0.5:
            continue
        out[o] = min(255, int(cell[0] / cell[3] + 0.5))
        out[o + 1] = min(255, int(cell[1] / cell[3] + 0.5))
        out[o + 2] = min(255, int(cell[2] / cell[3] + 0.5))
        out[o + 3] = min(255, int(alpha + 0.5))
    return bytes(out)


# --------------------------------------------------------------------------- #
# ICO: frames 16/32/48 como DIB clasico, 256 como PNG
# --------------------------------------------------------------------------- #

def dib_frame(size, rgba):
    """BITMAPINFOHEADER + BGRA de abajo-arriba + mascara AND de 1 bpp."""
    header = struct.pack(
        "<IiiHHIIiiII", 40, size, size * 2, 1, 32, 0, size * size * 4, 0, 0, 0, 0
    )
    body = bytearray(size * size * 4)
    for y in range(size):
        dst = (size - 1 - y) * size * 4
        src = y * size * 4
        for x in range(size):
            i = src + x * 4
            a = rgba[i + 3]
            o = dst + x * 4
            body[o] = rgba[i + 2] * a // 255
            body[o + 1] = rgba[i + 1] * a // 255
            body[o + 2] = rgba[i] * a // 255
            body[o + 3] = a
    mask_row = ((size + 31) // 32) * 4
    return header + bytes(body) + b"\x00" * (mask_row * size)


def flatten_on_bg(rgba, size, bg):
    """Source-over del glifo sobre un fondo opaco, alfa a 255."""
    br, bg_, bb = bg
    out = bytearray(size * size * 4)
    for i in range(size * size):
        a = rgba[i * 4 + 3]
        inv = 255 - a
        o = i * 4
        out[o] = (rgba[o] * a + br * inv) // 255
        out[o + 1] = (rgba[o + 1] * a + bg_ * inv) // 255
        out[o + 2] = (rgba[o + 2] * a + bb * inv) // 255
        out[o + 3] = 255
    return bytes(out)


def build_ico(frames):
    directory = b""
    body = b""
    offset = 6 + 16 * len(frames)
    for size, payload in frames:
        directory += struct.pack(
            "<BBBBHHII",
            0 if size >= 256 else size,
            0 if size >= 256 else size,
            0, 0, 1, 32, len(payload), offset,
        )
        body += payload
        offset += len(payload)
    return struct.pack("<HHH", 0, 1, len(frames)) + directory + body


# --------------------------------------------------------------------------- #

def main():
    cache = {}
    for out_name, src_name in SOURCES.items():
        src_path = os.path.join(ROOT, src_name)
        if not os.path.exists(src_path):
            print("skip %-18s (falta %s)" % (out_name, src_name))
            continue
        if src_name not in cache:
            cache[src_name] = read_ico_png(src_path)
        width, height, rgba = cache[src_name]
        if (width, height) != (256, 256):
            raise ValueError("%s no es 256x256" % src_path)

        frames = []
        for size in SIZES:
            scaled = downscale(width, rgba, size)
            frames.append(
                (size, encode_png(size, scaled) if size == 256 else dib_frame(size, scaled))
            )

        dest = os.path.join(ROOT, out_name)
        with open(dest, "wb") as fh:
            fh.write(build_ico(frames))
        print(
            "%-18s %7d bytes  frames=%s  (arte: %s)"
            % (out_name, os.path.getsize(dest), ",".join(map(str, SIZES)), src_name)
        )

    # apple-touch-icon
    touch_src = os.path.join(ROOT, TOUCH_SOURCE)
    if os.path.exists(touch_src):
        width, _, rgba = cache.get(TOUCH_SOURCE) or read_ico_png(touch_src)
        scaled = downscale(width, rgba, TOUCH_SIZE)
        flat = flatten_on_bg(scaled, TOUCH_SIZE, TOUCH_BG)
        dest = os.path.join(ROOT, TOUCH_DEST)
        with open(dest, "wb") as fh:
            fh.write(encode_png(TOUCH_SIZE, flat))
        print(
            "%-18s %7d bytes  %dx%d opaco sobre #%02x%02x%02x"
            % (TOUCH_DEST, os.path.getsize(dest), TOUCH_SIZE, TOUCH_SIZE, *TOUCH_BG)
        )


if __name__ == "__main__":
    main()
