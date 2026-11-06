#!/usr/bin/env bash
# Sets up Seed-VC (zero-shot voice conversion, CPU) under .vendor/ for engine/voice_convert.py.
# Only use with a voice you own or have explicit permission to use.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .vendor
export SSL_CERT_FILE=${SSL_CERT_FILE:-/root/.ccr/ca-bundle.crt} UV_NATIVE_TLS=1
if [ ! -d .vendor/seedvc ]; then
  python3 -c "from huggingface_hub import snapshot_download; snapshot_download('Plachta/Seed-VC', repo_type='space', local_dir='.vendor/seedvc', ignore_patterns=['examples/*','*.pyc','*/build/*','*.cu','*.cpp'])"
fi
# CPU patches: no 'spaces' package, fp32 Whisper, no fp16 autocast
mkdir -p .vendor/seedvc/spaces_stub && printf 'def GPU(*a, **k):\n    if a and callable(a[0]) and not k:\n        return a[0]\n    return lambda f: f\n' > .vendor/seedvc/spaces_stub/spaces.py
sed -i 's/torch_dtype=torch.float16/torch_dtype=torch.float32/' .vendor/seedvc/seed_vc_wrapper.py
sed -i 's/torch.autocast(device_type=self.device.type, dtype=torch.float16)/torch.autocast(device_type=self.device.type, dtype=torch.bfloat16, enabled=False)/' .vendor/seedvc/seed_vc_wrapper.py
if [ ! -x .vendor/vcenv/bin/python ]; then
  uv venv -q -p python3.11 .vendor/vcenv
  uv pip install -q -p .vendor/vcenv/bin/python torch==2.5.1 torchaudio==2.5.1 --index-url https://download.pytorch.org/whl/cpu
  uv pip install -q -p .vendor/vcenv/bin/python "numpy==1.26.4" "scipy==1.13.1" "librosa==0.10.2" munch einops pydub "transformers==4.46.3" soundfile pyyaml huggingface_hub hydra-core omegaconf python-dotenv
fi
echo "voice clone env ready: .vendor/vcenv/bin/python"
