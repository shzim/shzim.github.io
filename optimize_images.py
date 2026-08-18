import os
from PIL import Image

def optimize_directory(base_dir):
    img_dir = os.path.join(base_dir, 'img')
    os.makedirs(img_dir, exist_ok=True)
    
    image_specs = {
        'hero-bg': {'max_width': 1920, 'quality': 82},
        'img-1': {'max_width': 800, 'quality': 82},
        'img-11': {'max_width': 800, 'quality': 82},
        'img-13': {'max_width': 800, 'quality': 82},
        'img-14': {'max_width': 800, 'quality': 82},
        'img-2': {'max_width': 900, 'quality': 82},
        'Facebook': {'max_width': 96, 'quality': 90},
        'Instagram': {'max_width': 96, 'quality': 90},
        'Linkedin': {'max_width': 96, 'quality': 90},
        'Twitter': {'max_width': 96, 'quality': 90},
    }

    processed = set()
    sources = []
    
    for search_path in [base_dir, img_dir]:
        if not os.path.exists(search_path):
            continue
        for fname in os.listdir(search_path):
            fpath = os.path.join(search_path, fname)
            if not os.path.isfile(fpath):
                continue
            name_without_ext, ext = os.path.splitext(fname)
            ext_lower = ext.lower()
            if ext_lower in ['.png', '.jpg', '.jpeg']:
                if name_without_ext in image_specs and name_without_ext not in processed:
                    sources.append((name_without_ext, fpath))
                    processed.add(name_without_ext)

    print(f"--- Optimizing images in '{base_dir}' ---")
    total_before = 0
    total_after = 0

    for name, src_path in sources:
        spec = image_specs[name]
        dest_path = os.path.join(img_dir, f"{name}.webp")
        dest_root_path = os.path.join(base_dir, f"{name}.webp")

        src_size = os.path.getsize(src_path) / 1024
        total_before += src_size

        try:
            with Image.open(src_path) as img:
                w, h = img.size
                max_w = spec['max_width']
                if w > max_w:
                    new_h = int(h * (max_w / w))
                    resized = img.convert('RGB').resize((max_w, new_h), Image.Resampling.LANCZOS)
                else:
                    resized = img.convert('RGB')
                
                resized.save(dest_path, 'WEBP', quality=spec['quality'])
                if dest_path != dest_root_path:
                    resized.save(dest_root_path, 'WEBP', quality=spec['quality'])

            out_size = os.path.getsize(dest_path) / 1024
            total_after += out_size
            savings = ((src_size - out_size) / src_size) * 100
            print(f"  {name:15s}: {src_size:6.1f} KB -> {out_size:5.1f} KB ({savings:5.1f}% reduction)")
        except Exception as e:
            print(f"  {name:15s}: Error processing {src_path}: {e}")

    if total_before > 0:
        overall_savings = ((total_before - total_after) / total_before) * 100
        print(f"Directory total: {total_before:.1f} KB -> {total_after:.1f} KB ({overall_savings:.1f}% reduction)\n")

if __name__ == '__main__':
    dirs_to_optimize = ['.', 'shzim.github.io', 'zimbo']
    for d in dirs_to_optimize:
        if os.path.exists(d):
            optimize_directory(d)
