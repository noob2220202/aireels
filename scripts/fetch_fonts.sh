#!/usr/bin/env bash
# Downloads the open-licensed (SIL OFL) fonts used by the renderer.
set -euo pipefail
cd "$(dirname "$0")/../assets/fonts"
for w in Black ExtraBold Bold Medium; do
  [ -f Pretendard-$w.otf ] || curl -sSfL -o Pretendard-$w.otf https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-$w.otf
done
[ -f BlackHanSans-Regular.ttf ] || curl -sSfL -o BlackHanSans-Regular.ttf https://fonts.gstatic.com/s/blackhansans/v24/ea8Aad44WunzF9a-dL6toA8r8nqV.ttf
[ -f NotoSerifKR-Black.ttf ] || curl -sSfL -o NotoSerifKR-Black.ttf https://fonts.gstatic.com/s/notoserifkr/v32/3JnoSDn90Gmq2mr3blnHaTZXbOtLJDvui3JOnchPf852.ttf
[ -f SpecialElite-Regular.ttf ] || curl -sSfL -o SpecialElite-Regular.ttf https://fonts.gstatic.com/s/specialelite/v20/XLYgIZbkc4JPUL5CVArUVL0nhnc.ttf
ls -la
