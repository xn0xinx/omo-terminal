# Changelog

All notable changes to `omo-terminal` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Mascot Face & Posture Realignment**: Rebuilt the monospace coordinate grid for the code-composed Omo mascot so hair, glasses, cheeks, chin, neck, torso, and sneakers all share a strict centerline (column 12).
- **Eye & Glasses Invariance**: Equalized all eye expression variants (`open`, `blink`, `scan`, `think`, `dead`) to exactly 9 characters to prevent horizontal row jitter during animation ticks.
- **Fixed-Width Prop Gutter**: Anchored held props (document sheet, mini-terminal, stylus, radar) into a dedicated 9-character gutter (34 characters total width), ensuring the body never displaces when drawing or dropping items.
- **CSS Pre-Centering Distortion**: Switched `#omo-art` from `text-align: center` to `text-align: left; display: inline-block;` within the flex viewport, fixing character displacement caused by varying line widths.
- **Fullscreen & Any-Aspect Responsive Scaling**: Removed fixed `max-width: 1320px` and `max-height: 860px` caps on `#crt-bezel`. The monitor frame now seamlessly expands edge-to-edge in fullscreen or tiling mode at any aspect ratio (16:9, 16:10, 4:3, 21:9, vertical).
- **Adaptive Viewport Typography**: Fitted `#omo-art` with `clamp(12.5px, min(2.4vh, 1.45vw), 21px)` and responsive bezel padding (`vmin`-based) so Omo scales proportionally to fill the screen without letterboxing or clipping.
- **Responsive Telemetry & Layout**: Scaled dual telemetry column typography and workspace padding with viewport height and width.
- **Cyber Mission Control & Code Flanks**: Eliminated dead space around Omo by flanking the mascot with a live-streaming x86_64 disassembly column (left) and virtual memory hex dump (right) matching Omo's exact 27-row height.
- **Dynamic ASCII HUD Brackets & CPU Registers**: Added top/bottom ASCII framing HUD bars reporting Omarchy / Skylake / Hyprland / btrfs machine telemetry and live-flickering CPU registers (`RAX`, `RBX`, `RCX`, `RDX`) synchronized with the 12.5 fps animation clock.
- **Cute Boy Omo Reference Realignment**: Rebuilt Omo from the ground up to faithfully match the reference concept art (`image_20260912215812.jpeg`):
  - Round glasses frames (`.---.` top, `\_/ \_/` bottom) connected via horizontal temple arms (`--|` / `|--`) into side ears and hair tufts (`|<>/` and `\<>|`).
  - Added a dedicated buffer row of cheeks (`\                   /`) separating the glasses frames from the boyish smile (`\___/`), eliminating the visual honeycomb/snout optical illusion.
  - Oversized cozy hoodie with collar seam, hanging drawstrings, clean `|OMO|` chest, kangaroo pouch (`+-----------+`), and ribbed bottom hem (`\___________/`).
  - Baggy pants with knee folds and chunky skate sneakers with animated star tongue.
- **Dynamic Procedural Facial Expressions & Articulation**:
  - **Eyes**: Natural blinking cycles, ambient saccades looking left and right towards telemetry flanks, thinking gaze (`(^)` / `(◎)`), coding focus (`(=)`), star sparkles (`(★)`), and error spirals (`(×)`).
  - **Mouth Articulation**: Real-time talking mouth flap (`\___/` -> `\_/` -> `(o)` -> `---`) synchronized with streaming tokens in the BBS drawer, pursed lips during thinking (`.-~-.`), and celebratory grins (`\___/`).
  - **Body Articulation**: Dedicated poses for idle (hands tucked into kangaroo pouch, foot tapping to the beat), thinking ("The Thinker" hand-to-chin pose), shell/testing (typing on mini terminal), reading (holding CRT datasheet), writing (etching code with flying sparks), and victory celebration.
- **Darkened CRT Monitor Bezel & Obsidian Frame**: Darkened `--bezel-color` to `#020402`, `--bezel-edge` to `#060806`, and the chassis frame to pure black `#000000`, creating a seamless transition into the physical monitor's matte chassis bezel.
- **CRT Barrel Curve Safe-Area Insets**: Added adaptive safe-area insets when `.barrel-curve` is active (`clamp(32px, 4.2vmin, 64px)` horizontal padding, `clamp(22px, 3.2vmin, 44px)` bottom padding), pulling the entire UI safely inside the confines of the CRT screen so edge curvature and shader bounds never clip text.
- **High-Contrast Prompt Input Framing**: Elevated `#bottom-bar` with an inset dark phosphor backing (`rgba(3, 14, 6, 0.75)`) and subtle border, lifting the typing prompt clear of the bottom curvature.
- **Calibrated Shader Curvature & Vignette**: Tuned WebGL barrel curvature uniform from `0.18` to `0.08` and softened the vignette minimum clamp floor to `0.25`, preserving retro CRT tube depth while eliminating corner darkness bleed.
- **Dynamic CRT Color Themes & OS Default Synchronization**:
  - Added `/api/theme` backend endpoint dynamically parsing active Omarchy desktop theme colors (`base`, `text`, `accent`, `dim`, `dark`, `glow`, `bezel`).
  - Added theme selector in the top HUD bracket with 7 phosphor color presets: `Classic Green`, `OS Default`, `Amber Phosphor`, `Cyberpunk Cyan`, `Tokyo Night`, `Blood Matrix`, and `Synthwave 84`.
  - Added a one-click `[FLIP]` button and `F2` / `Alt+T` keyboard shortcut to toggle rapidly between Classic Green and OS Default.
  - Linked theme color changes to a dynamic `uTint` WebGL fragment shader uniform, tinting the authentic phosphor glow, scanlines, and vignette in real time.
  - Persisted theme preferences across reloads via `localStorage`.

## [0.1.0] - 2026-09-13

### Added
- Initial release of `omo-terminal`.
- Antigravity engine backend wrapping `agy --input-format stream-json --output-format stream-json`.
- Retro WebGL CRT shader viewport with authentic barrel curvature, phosphor glow, and scanlines inside a vintage TV monitor bezel.
- High-density ASCII Omo mascot matching the reference concept (curly code hair, swirl glasses `(@)(@)`, hoodie, sneakers).
- Procedural ASCII animator reacting to live tool calls (reading glowing document, writing code, terminal shell typing, radar searching, thinking).
- Dual background telemetry columns streaming real file trees, bash output, and code blocks.
- Teletype BBS dialogue drawer for conversational responses.
- Multi-model dropdown querying `agy models` (default Gemini 3.8 Flash, 3.7 Flash, 3.1 Pro, Claude, GPT-OSS).
- Silent by default audio design suited for streaming and REAPER.
- Omarchy / Arch packaging, install script, desktop entry, and Hyprland window rule.
