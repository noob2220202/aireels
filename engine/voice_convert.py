"""Zero-shot voice conversion of TTS clips into a reference voice (Seed-VC v1, CPU).

Run with the vendored env (scripts/setup_voice_clone.sh):
  .vendor/vcenv/bin/python engine/voice_convert.py --ref assets/voices/my_voice_ref.wav [--steps 25] in.wav:out.wav [...]

Only use a reference voice you own or have explicit permission to use.
Output keeps the exact input length (48 kHz mono) so word timings and subtitles stay valid.
"""
import argparse
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VC = ROOT / '.vendor' / 'seedvc'
sys.path[:0] = [str(VC), str(VC / 'spaces_stub')]
os.chdir(VC)  # seed-vc loads configs with relative paths
os.environ.setdefault('SSL_CERT_FILE', '/root/.ccr/ca-bundle.crt')
os.environ.setdefault('REQUESTS_CA_BUNDLE', '/root/.ccr/ca-bundle.crt')

import numpy as np  # noqa: E402
import librosa  # noqa: E402
import soundfile as sf  # noqa: E402
import torch  # noqa: E402

torch.set_num_threads(max(1, os.cpu_count() or 1))


def embed(w, audio, sr):
    a16 = librosa.resample(audio, orig_sr=sr, target_sr=16000)
    feat = torch.from_numpy(librosa.feature.melspectrogram(y=a16, sr=16000)).float()  # placeholder shape check
    import torchaudio
    fb = torchaudio.compliance.kaldi.fbank(torch.from_numpy(a16).float().unsqueeze(0), num_mel_bins=80, dither=0, sample_frequency=16000)
    fb = fb - fb.mean(dim=0, keepdim=True)
    with torch.no_grad():
        e = w.campplus_model(fb.unsqueeze(0))
    return torch.nn.functional.normalize(e, dim=-1)[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ref', required=True)
    ap.add_argument('--steps', type=int, default=25)
    ap.add_argument('--cfg', type=float, default=0.7)
    ap.add_argument('--report', action='store_true')
    ap.add_argument('pairs', nargs='+')
    a = ap.parse_args()
    from seed_vc_wrapper import SeedVCWrapper
    t0 = time.time()
    w = SeedVCWrapper(device=torch.device('cpu'))
    print(f'model loaded in {time.time() - t0:.1f}s', flush=True)
    ref = str(Path(a.ref).resolve())
    ref_audio, rsr = librosa.load(ref, sr=16000)
    e_ref = embed(w, ref_audio, 16000) if a.report else None
    for pair in a.pairs:
        src, dst = pair.split(':', 1)
        src, dst = str((ROOT / src).resolve() if not os.path.isabs(src) else src), str((ROOT / dst).resolve() if not os.path.isabs(dst) else dst)
        t1 = time.time()
        out = w.convert_voice(source=src, target=ref, diffusion_steps=a.steps, length_adjust=1.0,
                              inference_cfg_rate=a.cfg, f0_condition=False, stream_output=False)
        if not isinstance(out, np.ndarray):  # generator form
            res = None
            try:
                while True:
                    next(out)
            except StopIteration as e:
                res = e.value
            out = res
        out = np.asarray(out, dtype=np.float32)
        y = librosa.resample(out, orig_sr=22050, target_sr=48000)
        n = sf.info(src).frames * 48000 // sf.info(src).samplerate
        y = np.pad(y, (0, max(0, n - len(y))))[:n]
        y = y / (np.abs(y).max() + 1e-9) * 0.9
        sf.write(dst, y, 48000)
        msg = f'{Path(src).name} -> {Path(dst).name}  {len(y) / 48000:.2f}s in {time.time() - t1:.1f}s'
        if a.report:
            s_in = librosa.load(src, sr=16000)[0]
            s_out = librosa.resample(y, orig_sr=48000, target_sr=16000)
            sim_in = float(embed(w, s_in, 16000) @ e_ref)
            sim_out = float(embed(w, s_out, 16000) @ e_ref)
            msg += f'  similarity to my voice: TTS {sim_in:.2f} -> converted {sim_out:.2f}'
        print(msg, flush=True)


if __name__ == '__main__':
    main()
