#!/usr/bin/env bash
# Download the open-licence (OFL) Korean fonts the renderer uses into assets/fonts/.
set -euo pipefail
cd "$(dirname "$0")/../assets/fonts"
G=https://raw.githubusercontent.com/google/fonts/main/ofl
P=https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/alternative
get() { [ -s "$(basename "$1")" ] || curl -fsSL --retry 3 -o "$(basename "$1")" "$1"; }
for w in Medium SemiBold Bold ExtraBold; do get "$P/Pretendard-$w.ttf"; done
get "$G/gaegu/Gaegu-Regular.ttf";  get "$G/gaegu/Gaegu-Bold.ttf"
get "$G/jua/Jua-Regular.ttf"
get "$G/gowundodum/GowunDodum-Regular.ttf"
get "$G/gowunbatang/GowunBatang-Regular.ttf"; get "$G/gowunbatang/GowunBatang-Bold.ttf"
get "$G/nanumpenscript/NanumPenScript-Regular.ttf"
get "$G/blackhansans/BlackHanSans-Regular.ttf"
get "$G/dongle/Dongle-Bold.ttf"
ls -la
