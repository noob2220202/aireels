"""Transcribe each scene's TTS clip with Whisper and compare to the script (catches misread numbers/names)."""
import json, os, sys
from pathlib import Path
os.environ.setdefault('REQUESTS_CA_BUNDLE', '/root/.ccr/ca-bundle.crt')
os.environ.setdefault('SSL_CERT_FILE', '/root/.ccr/ca-bundle.crt')
from faster_whisper import WhisperModel
import soundfile as sf
from scipy import signal

P = Path(sys.argv[1]); B = P / 'build'
TL = json.loads((B / 'timeline.json').read_text())
S = json.loads((P / 'script.json').read_text())
m = WhisperModel(sys.argv[2] if len(sys.argv) > 2 else 'small', device='cpu', compute_type='int8')
for sc, v in zip(S['scenes'], TL['voice']):
    x, sr = sf.read(str(B / v['file']), dtype='float32')
    x = signal.resample_poly(x, 16000, sr).astype('float32')
    segs, _ = m.transcribe(x, language='ko', beam_size=5)
    heard = ' '.join(s.text.strip() for s in segs)
    print(f"[{sc['id']}]\n  script: {sc.get('tts', sc['say'])}\n  heard : {heard}")
