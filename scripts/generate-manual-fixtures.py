from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "test-fixtures" / "manual"
OUT.mkdir(parents=True, exist_ok=True)


def make_sprite(transparent: bool) -> Image.Image:
    background = (28, 38, 52, 0 if transparent else 255)
    image = Image.new("RGBA", (16, 16), background)
    draw = ImageDraw.Draw(image)
    draw.rectangle((3, 4, 12, 13), fill=(69, 170, 242, 255))
    draw.rectangle((4, 2, 11, 5), fill=(113, 224, 141, 255))
    draw.rectangle((5, 6, 6, 7), fill=(18, 25, 32, 255))
    draw.rectangle((9, 6, 10, 7), fill=(18, 25, 32, 255))
    draw.rectangle((6, 10, 9, 11), fill=(255, 213, 105, 255))
    draw.point((2, 11), fill=(255, 105, 120, 255))
    draw.point((13, 11), fill=(255, 105, 120, 255))
    return image


transparent_native = make_sprite(True)
opaque_native = make_sprite(False)

transparent_large = transparent_native.resize((256, 256), Image.Resampling.NEAREST)
opaque_large = opaque_native.resize((256, 256), Image.Resampling.NEAREST)

# Add a few sub-grid inconsistencies without destroying the underlying 16 px grid.
draw = ImageDraw.Draw(opaque_large)
draw.rectangle((80, 96, 91, 108), fill=(72, 173, 239, 255))
draw.rectangle((144, 96, 158, 109), fill=(67, 168, 245, 255))

transparent_large.save(OUT / "transparent-grid.png", format="PNG")
opaque_large.convert("RGB").save(OUT / "uneven-grid.jpg", format="JPEG", quality=90)
opaque_large.save(OUT / "uneven-grid.webp", format="WEBP", quality=90)
opaque_large.save(OUT / "png-content-wrong-extension.jpg", format="PNG")

print(OUT)
