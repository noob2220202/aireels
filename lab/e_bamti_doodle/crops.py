# crops for self-review: python3 crops.py <outdir>
import sys
from PIL import Image
out = sys.argv[1]
im = Image.open('/home/user/aireels/lab/e_bamti_doodle/out/scene.png').convert('RGB')
im.crop((520, 480, 1080, 880)).save(out + '/c_him.png')
im.crop((40, 820, 640, 1280)).save(out + '/c_her.png')
im.crop((0, 180, 1080, 580)).save(out + '/c_bubbles.png')
im.resize((360, 640), Image.LANCZOS).save(out + '/c_small.png')
im.crop((40, 1150, 1000, 1920)).resize((720, 578), Image.LANCZOS).save(out + '/c_low.png')
