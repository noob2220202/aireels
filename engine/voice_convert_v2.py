"""Seed-VC v2 conversion with optional style/accent conversion (prosody follows the reference speaker).
Length is NOT preserved when --style is used. Run with .vendor/vcenv/bin/python.
"""
import argparse, os, sys, time
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
VC = ROOT / '.vendor' / 'seedvc'
CWD0 = Path.cwd()
sys.path[:0] = [str(VC), str(VC / 'spaces_stub')]
os.chdir(VC)
os.environ.setdefault('SSL_CERT_FILE', '/root/.ccr/ca-bundle.crt')
os.environ.setdefault('REQUESTS_CA_BUNDLE', '/root/.ccr/ca-bundle.crt')
import numpy as np, librosa, soundfile as sf, torch, yaml  # noqa: E402
torch.set_num_threads(max(1, os.cpu_count() or 1))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ref', required=True)
    ap.add_argument('--steps', type=int, default=30)
    ap.add_argument('--style', action='store_true')
    ap.add_argument('pairs', nargs='+')
    a = ap.parse_args()
    absp = lambda q: str(q if os.path.isabs(q) else (CWD0 / q).resolve())
    from hydra.utils import instantiate
    from omegaconf import DictConfig
    t0 = time.time()
    cfg = DictConfig(yaml.safe_load(open('configs/v2/vc_wrapper.yaml')))
    w = instantiate(cfg); w.load_checkpoints(); w.to(torch.device('cpu')); w.eval()
    w.setup_ar_caches(max_batch_size=1, max_seq_len=4096, dtype=torch.float32, device=torch.device('cpu'))
    print(f'v2 loaded in {time.time() - t0:.1f}s', flush=True)
    for pair in a.pairs:
        src, dst = [absp(x) for x in pair.split(':', 1)]
        t1 = time.time()
        gen = w.convert_voice_with_streaming(source_audio_path=src, target_audio_path=absp(a.ref), diffusion_steps=a.steps,
                                             convert_style=a.style, device=torch.device('cpu'), dtype=torch.float32, stream_output=False)
        out = None
        try:
            while True:
                out = next(gen)
        except StopIteration as e:
            out = e.value if e.value is not None else out
        if isinstance(out, tuple):
            out = out[-1]
        y = np.asarray(out, dtype=np.float32).squeeze()
        y = librosa.resample(y, orig_sr=w.sr, target_sr=48000)
        y = y / (np.abs(y).max() + 1e-9) * .9
        sf.write(dst, y, 48000)
        print(f'{Path(src).name} -> {Path(dst).name}  {len(y)/48000:.2f}s in {time.time()-t1:.1f}s', flush=True)

if __name__ == '__main__':
    main()
