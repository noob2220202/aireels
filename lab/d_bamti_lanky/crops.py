# crops for review: faces, bubbles, bag at native size + 360x640 phone downscale
from PIL import Image
import os
d = os.path.dirname(os.path.abspath(__file__)) + '/out/'
im = Image.open(d + 'scene.png').convert('RGB')
im.crop((40, 700, 520, 1120)).save(d + 'crop_her.png')
im.crop((480, 380, 960, 900)).save(d + 'crop_him.png')
im.crop((0, 190, 1080, 700)).save(d + 'crop_bubbles.png')
im.crop((280, 1000, 900, 1500)).save(d + 'crop_bag.png')
im.resize((360, 640), Image.LANCZOS).save(d + 'small.png')
