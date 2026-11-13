# aireels

Serialized webtoon-style cut-dramas (컷드라마) for Instagram Reels: 1-minute vertical episodes with code-drawn
characters, speech bubbles, light motion, synthesized music and sound effects.

- Design contract: [docs/SPEC.md](docs/SPEC.md)
- Fonts: `./scripts/get_fonts.sh` (downloads open-licence Korean fonts into `assets/fonts/`)
- Build an episode: `python3 engine/build.py series/<slug>/ep01.json`
