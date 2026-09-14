/**
 * Omo ASCII Mascot Engine: High-density code-composed character with procedural animation.
 * Replicates the reference art: code hair, swirl glasses, hoodie, code sneakers, and held props.
 * Also drives the high-density cyberpunk HUD telemetry, waveforms, registers, and system traces.
 */
(function() {
  "use strict";

  const targetEl = document.getElementById("omo-art");
  if (!targetEl) return;
  const flankLeftEl = document.getElementById("flank-left-code");
  const flankRightEl = document.getElementById("flank-right-code");
  const regStreamEl = document.getElementById("hud-reg-stream");
  const ripStreamEl = document.getElementById("hud-rip-bar");
  const controlRegsEl = document.getElementById("hud-control-regs");
  const waveformEl = document.getElementById("hud-waveform");
  const sensorEl = document.getElementById("sensor-telemetry");
  const socketEl = document.getElementById("socket-telemetry");
  const engineEl = document.getElementById("engine-telemetry");
  const traceEl = document.getElementById("trace-telemetry");

  let currentTag = "idle";
  let frameCount = 0;
  let animTimer = null;

  // Code symbols for glyph shimmers
  const HAIR_GLYPHS = [".", "*", "$", "/", "\\", "%", "!", "<", ">", "+", "=", "&", "~"];
  const WAVE_BARS = [" ", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

  const BASE_OPCODES = [
    "0x0040: PUSH RBP",
    "0x0041: MOV RBP, RSP",
    "0x0044: SUB RSP, 0x20",
    "0x0048: CALL <omo_core>",
    "0x004D: TEST EAX, EAX",
    "0x004F: JNZ 0x0062",
    "0x0051: XOR ECX, ECX",
    "0x0053: LEA RDI, [rel_str]",
    "0x005A: MOV RSI, 0x1",
    "0x0061: SYSCALL (sys_write)",
    "0x0063: CMP RAX, 0x0",
    "0x0067: JLE <err_halt>",
    "0x0069: MOV RDX, 0x20",
    "0x006E: PUSH RAX",
    "0x006F: CALL <agy_event>",
    "0x0074: NOP",
    "0x0075: MOV RAX, [rsp+8]",
    "0x0078: SHL RAX, 3",
    "0x007C: XOR RDX, RDX",
    "0x007F: CALL <pipewire>",
    "0x0084: TEST RAX, RAX",
    "0x0086: JZ 0x0098",
    "0x0088: SYSCALL (epoll_wait)",
    "0x008D: MOV RDI, 0x3",
    "0x0092: CALL <reaper_sync>",
    "0x0097: NOP",
    "0x0098: LEA RSI, [omo_buf]",
    "0x009F: MOV RCX, 0x100",
    "0x00A4: REP MOVSB",
    "0x00A6: SYSCALL (sys_read)",
    "0x00AB: CMP EAX, 0x0",
    "0x00AE: JNZ 0x00B8",
    "0x00B0: PAUSE",
    "0x00B2: JMP 0x0040",
    "0x00B7: HLT",
    "0x00B8: MOV EAX, 0x1",
    "0x00BD: RET",
    "0x00BE: INT3",
    "0x00BF: NOP",
  ];

  const BASE_HEX = [
    "0000: 7F 45 4C 46 02 01 01 00  .ELF....",
    "0008: 00 00 00 00 00 00 00 00  ........",
    "0010: 03 00 3E 00 01 00 00 00  ..>.....",
    "0018: 20 18 00 00 00 00 00 00   .......",
    "0020: 40 00 00 00 00 00 00 00  @.......",
    "0028: C0 39 01 00 00 00 00 00  .9......",
    "0030: 00 00 00 00 40 00 38 00  ....@.8.",
    "0038: 0D 00 1E 00 06 00 00 00  ........",
    "0040: 04 00 00 00 40 00 00 00  ....@...",
    "0048: 33 FF 66 00 00 00 00 00  3.f.....",
    "0050: 48 89 E5 5D C3 90 90 90  H..]....",
    "0058: 48 8D 3D 00 00 00 00 00  H.=.....",
    "0060: B8 01 00 00 00 0F 05 C3  ........",
    "0068: 55 48 89 E5 48 83 EC 10  UH..H...",
    "0070: 48 89 7D F8 48 8B 45 F8  H.}.H.E.",
    "0078: 8B 00 5D C3 90 90 90 90  ..].....",
    "0080: 01 00 02 00 00 00 00 00  ........",
    "0088: 2F 64 65 76 2F 6E 76 6D  /dev/nvm",
    "0090: 65 30 6E 31 70 32 00 00  e0n1p2..",
    "0098: 62 74 72 66 73 00 00 00  btrfs...",
    "00A0: 73 79 73 74 65 6D 64 00  systemd.",
    "00A8: 6C 69 6E 75 78 2D 7A 65  linux-ze",
    "00B0: 6E 00 00 00 00 00 00 00  n.......",
    "00B8: 50 49 50 45 57 49 52 45  PIPEWIRE",
    "00C0: 52 45 41 50 45 52 00 00  REAPER..",
    "00C8: 55 4D 43 32 32 00 00 00  UMC22...",
    "00D0: 4F 4D 41 52 43 48 59 00  OMARCHY.",
    "00D8: 41 4E 54 49 47 52 41 56  ANTIGRAV",
    "00E0: 47 45 4D 49 4E 49 2D 33  GEMINI-3",
    "00E8: 2E 38 2D 46 4C 41 53 48  .8-FLASH",
    "00F0: 48 59 50 52 4C 41 4E 44  HYPRLAND",
  ];

  const SYSCALL_TRACE = [
    "epoll_pwait2(5, [{EPOLLIN, fd=12}], 64, {0, 0}) = 1",
    "read(12, \"{\\\"type\\\":\\\"tool_call\\\",\\\"id\\\":\\\"tc_0\\\"}\", 4096) = 38",
    "futex_wake(&u32_lock, FUTEX_WAKE_PRIVATE, 1) = 1",
    "writev(2, [{iov_base=\"> [OK]\", iov_len=6}], 1) = 6",
    "clock_gettime(CLOCK_MONOTONIC_RAW, {196, 401202}) = 0",
    "recvmsg(8, {msg_name=NULL, msg_flags=0}, 0) = 64",
    "sendto(14, \"HTTP/1.1 200 OK\\r\\n...\", 182, 0, NULL, 0) = 182",
    "ioctl(16, DRM_IOCTL_I915_GEM_EXECBUFFER2, ...) = 0",
    "pipewire_client_process(pw_node=0x7ffe) -> sync 64smp",
    "mprotect(0x7ffff7fc0000, 4096, PROT_READ|PROT_WRITE) = 0",
    "readlink(\"/proc/self/exe\", \"/usr/bin/python3\", 4096) = 17",
    "sched_yield() = 0 [thread_pwait_done]",
  ];

  let idleTimer = 0;
  let activeFlourish = null;
  let flourishTick = 0;

  // Generate dynamic code hair with subtle glyph shimmer & failure glitch (exactly 25 chars per row)
  function getHair(tick, tag, isGlitch) {
    const s1 = HAIR_GLYPHS[(tick) % HAIR_GLYPHS.length];
    const s2 = HAIR_GLYPHS[(tick + 3) % HAIR_GLYPHS.length];
    const s3 = HAIR_GLYPHS[(tick + 7) % HAIR_GLYPHS.length];
    if (isGlitch) {
      return [
        `       ,.//${s2}$$..*/       `,
        `    .#!/*.....$$...${s1}*/   `,
        `   <==?!/*....$$....*/   `,
        `   /**..$$....$$...*/*   `,
        `   /*...$$ '   '\\$$..*/  `,
        `   =<#   $/   \\$   #>=   `,
      ];
    }
    return [
      `       ,.//${s1}$$..*/       `,
      `    .$!/*.....$$...${s2}*/   `,
      `   <===!/*....$$....*/   `,
      `   /**..$$....$$...*/*   `,
      `   /*...$$ '   '\\$$..*/  `,
      `   =<>   $/   \\$   <>=   `,
    ];
  }

  // Dynamic human boy face: extensive expression matrix, animated eyebrows, saccades, and mouth shapes
  function getFace(tag, tick, flourish, fTick) {
    let eyeL = "(@)", eyeR = "(@)";
    let mouth = "\\___/"; // strictly 5 characters
    let browL = " --|", browR = "|--";

    // Quick natural double blink
    const isBlink = (tick % 28 === 0 || tick % 28 === 1 || tick % 28 === 3);

    if (tag === "idle") {
      if (flourish === "adjust_glasses") {
        // Hand reaches up to glasses temple
        if (fTick >= 4 && fTick <= 16) {
          browL = "(.)|"; // Left hand adjusting glasses!
          eyeL = "(─)"; eyeR = "(@)"; // winks with left eye while adjusting
          mouth = "\\===/"; // playful smirk
        } else {
          eyeL = "(@)"; eyeR = "(@)";
        }
      } else if (flourish === "head_scratch") {
        eyeL = "(^)"; eyeR = "(@)"; // looks up while scratching
        mouth = " .o. "; // whistle
        browL = " ` |"; browR = "|~-";
      } else if (flourish === "wave") {
        eyeL = (fTick % 8 < 4) ? "(─)" : "(@)"; // playful wink!
        eyeR = "(@)";
        mouth = "\\===/"; // big friendly grin
        browL = " -~|"; browR = "|~-";
      } else if (flourish === "stretch") {
        if (fTick >= 4 && fTick <= 18) {
          eyeL = "(─)"; eyeR = "(─)"; // eyes closed in yawn
          mouth = " (O) "; // yawn
        } else {
          eyeL = "(@)"; eyeR = "(@)";
          mouth = "\\___/";
        }
      } else if (flourish === "thumbs_up") {
        eyeL = "(★)"; eyeR = "(^)"; // star sparkle wink!
        mouth = "\\===/";
        browL = " -~|"; browR = "|~-";
      } else if (flourish === "foot_tap" || flourish === "fidget") {
        eyeL = (tick % 8 < 4) ? "(@)" : "(=)";
        eyeR = eyeL;
        mouth = (tick % 6 < 3) ? "\\___/" : "\\===/";
      } else {
        // Ambient natural idle: blinking, saccades, and glasses glint
        if (isBlink) {
          eyeL = "(─)"; eyeR = "(─)";
        } else {
          // Glasses glint sweep
          const glintCycle = tick % 32;
          if (glintCycle === 8) {
            eyeL = "(*)"; eyeR = "(@)";
          } else if (glintCycle === 9) {
            eyeL = "(@)"; eyeR = "(*)";
          } else {
            // Rapid saccades looking around at tech flanks
            const sCycle = tick % 60;
            if (sCycle >= 12 && sCycle < 22) {
              eyeL = "(>)"; eyeR = "(>)"; // glance right at memory dump
              browR = "|~-";
            } else if (sCycle >= 35 && sCycle < 45) {
              eyeL = "(<)"; eyeR = "(<)"; // glance left at disassembly
              browL = "-~|";
            } else if (sCycle >= 50 && sCycle < 55) {
              eyeL = "(^)"; eyeR = "(^)"; // look up at waveform
            } else {
              eyeL = "(@)"; eyeR = "(@)";
            }
          }
        }
      }
    } else if (tag === "thinking") {
      const tPhase = tick % 24;
      if (tPhase < 8) {
        eyeL = "(^)"; eyeR = "(^)";
        mouth = ".-~-.";
        browL = " ` |"; browR = "| '";
      } else if (tPhase < 16) {
        eyeL = "(◎)"; eyeR = "(◎)";
        mouth = " \\_/ ";
      } else {
        eyeL = "(>)"; eyeR = "(>)";
        mouth = "\\___/";
      }
    } else if (tag === "talking" || tag === "assistant_delta") {
      const mCycle = tick % 4;
      if (mCycle === 0) mouth = "\\___/";
      else if (mCycle === 1) mouth = " \\_/ ";
      else if (mCycle === 2) mouth = " (o) ";
      else mouth = " --- ";

      eyeL = (tick % 16 < 8) ? "(@)" : "(^)";
      eyeR = eyeL;
    } else if (tag === "shell" || tag === "testing") {
      eyeL = (tick % 6 < 3) ? "(=)" : "(v)";
      eyeR = eyeL;
      mouth = (tick % 8 < 4) ? "\\===/" : " --- ";
    } else if (tag === "reading") {
      eyeL = "(>)"; eyeR = "(>)";
      mouth = "\\___/";
      if (tick % 30 >= 15 && tick % 30 <= 22) {
        browL = "(.)|"; // checks glasses
      }
    } else if (tag === "writing") {
      eyeL = (tick % 8 < 4) ? "(v)" : "(@)";
      mouth = "\\___/";
    } else if (tag === "searching") {
      const sCycle = tick % 16;
      if (sCycle < 4) { eyeL = "(<)"; eyeR = "(<)"; }
      else if (sCycle < 8) { eyeL = "(@)"; eyeR = "(@)"; }
      else if (sCycle < 12) { eyeL = "(>)"; eyeR = "(>)"; }
      else { eyeL = "(@)"; eyeR = "(@)"; }
      mouth = " (o) ";
    } else if (tag === "success") {
      eyeL = (tick % 8 < 4) ? "(★)" : "(^)";
      eyeR = eyeL;
      mouth = "\\===/";
      browL = " -~|"; browR = "|~-"; // happy raised brows
    } else if (tag === "failure") {
      eyeL = "(×)"; eyeR = "(×)";
      mouth = "\\~_~/";
      browL = " ` |"; browR = "| '";
    } else if (tag === "waiting-user") {
      eyeL = (tick % 20 < 12) ? "(o)" : "(@)";
      eyeR = eyeL;
      mouth = " \\_/ ";
    }

    return [
      `  |<>/ .---.   .---. \\<>|`,
      ` ${browL}  ${eyeL}  ---  ${eyeR}  ${browR}`,
      `  | \\   \\_/     \\_/   / |`,
      `   \\                   / `,
      `    \\      ${mouth}      /  `,
      `     \\_______________/   `,
    ];
  }

  // Functional articulated arms & interactive prop actions (strictly 25 chars body + 9 chars gutter)
  function getHoodieAndProps(tag, tick, flourish, fTick) {
    let sideL = " |  ///// ";
    let foldL = " | /      ";
    let armL  = " | |   ";
    let cuffL = " [===] ";
    let handL = " ( . ) ";

    let sideR = " \\\\\\\\  |";
    let foldR = "  \\\\\\  |";
    let armR  = "\\ |";
    let cuffR = "     ";
    let handR = "     ";

    // Animated drawstrings swaying with breath
    let stringL = " ( ) ";
    let stringR = " ( ) ";
    const sTick = Math.floor(tick / 4) % 4;
    if (sTick === 1) stringL = " (\\) ";
    else if (sTick === 3) stringR = " (/) ";

    let propRows = [
      "         ",
      "         ",
      "         ",
      "         ",
      "         ",
      "         ",
    ];

    if (tag === "idle") {
      if (flourish === "adjust_glasses") {
        // Left arm reaches up to temple
        if (fTick < 4) {
          sideL = " |  ////| ";
          foldL = " | /   /  ";
          cuffL = " [===] ";
        } else if (fTick <= 16) {
          sideL = " |  /// | ";
          foldL = " | /  /   ";
          armL  = " | | / ";
          cuffL = "   |   ";
          handL = "   |   ";
        }
      } else if (flourish === "head_scratch") {
        // Right arm scratches hair
        if (fTick >= 3 && fTick <= 18) {
          sideR = " \\\\\\ |/|";
          foldR = "  \\\\ / |";
          armR  = "/ |";
          propRows[0] = "  (.)~~  "; // scratch fingers in hair!
          propRows[1] = "   /     ";
        }
      } else if (flourish === "wave") {
        // Right arm waves
        sideR = " \\\\\\\\ /|";
        foldR = "  \\\\\\/ |";
        armR = "/--";
        const waveHand = (fTick % 4 < 2) ? "\\ o /" : "/ o \\";
        propRows[0] = `  ${waveHand}  `;
        propRows[1] = "   \\|/   ";
        propRows[2] = "    |    ";
        propRows[3] = "    /    ";
      } else if (flourish === "thumbs_up") {
        sideR = " \\\\\\\\ /|";
        foldR = "  \\\\\\/ |";
        armR = "/--";
        propRows[0] = "  ( b )  "; // Thumbs up!
        propRows[1] = "   \\|/   ";
        propRows[2] = "    |    ";
      } else if (flourish === "stretch") {
        // Both arms stretched up
        sideL = " |/ ///// ";
        foldL = " / /      ";
        sideR = " \\\\\\\\ \\|";
        foldR = "     \\ \\";
        propRows[0] = " \\ o /   ";
        propRows[1] = "  \\|/    ";
      } else if (flourish === "foot_tap" || flourish === "fidget") {
        // Hands wiggling in pouch
        handL = (tick % 4 < 2) ? " ( . ) " : " (. .) ";
      }
    } else if (tag === "thinking") {
      // The Thinker: right hand cupping chin, floating math/code sparks
      sideR = " \\\\  / |";
      foldR = "  \\\\/  |";
      armR = "/ |";
      handR = "     ";
      const tap = (tick % 6 < 3) ? " ( . )" : " (|. )";
      const thought = (tick % 8 < 2) ? "   ?     " : (tick % 8 < 4) ? "  λ.     " : (tick % 8 < 6) ? "   *     " : "         ";
      propRows[0] = tap + "   ";
      propRows[1] = thought;
    } else if (tag === "talking" || tag === "assistant_delta") {
      // Gesturing right hand
      const gCycle = tick % 8;
      if (gCycle < 4) {
        armR = "\\--";
        propRows[3] = " |--[>   ";
        propRows[4] = "  \\      ";
      } else {
        armR = "^--";
        propRows[2] = "  /--[>  ";
        propRows[3] = " /       ";
      }
    } else if (tag === "shell" || tag === "testing") {
      // Both hands typing on mini terminal with rapid key alternation
      const cur = (tick % 2 === 0) ? "█" : " ";
      const t1 = (tick % 4 < 2) ? "[o]" : "[-]";
      const t2 = (tick % 4 >= 2) ? "[o]" : "[-]";
      const miniLog = (tick % 6 < 3) ? ">_agy " : ">_git ";
      propRows = [
        " .-----. ",
        `|${miniLog}${cur}|`,
        `|${t1}${t2}| `,
        " '-----' ",
        " [=====] ",
        "         ",
      ];
      armR = "\\--";
    } else if (tag === "reading") {
      // Inspecting glowing document
      const bars = (tick % 3 === 0) ? "[====]" : (tick % 3 === 1) ? "[≡≡≡≡]" : "[----]";
      const scanGlow = (tick % 2 === 0) ? "::." : ":.:";
      propRows = [
        " .----.  ",
        `/  ${scanGlow} \\ `,
        `|${bars}| `,
        `|${bars}| `,
        `|${bars}| `,
        " '----'  ",
      ];
      armR = "\\--";
    } else if (tag === "writing") {
      // Etching stylus with multi-direction flying sparks
      const spark = (tick % 4 === 0) ? "✦" : (tick % 4 === 1) ? "·" : (tick % 4 === 2) ? "*" : "+";
      const stroke = (tick % 4 === 0) ? " \\/ " : (tick % 4 === 1) ? " \\_ " : (tick % 4 === 2) ? " /| " : " \\| ";
      propRows = [
        `   ${spark}     `,
        "   /\\    ",
        "  /  \\   ",
        "  |  |   ",
        "  |  |   ",
        `  ${stroke}   `,
      ];
      armR = "\\--";
    } else if (tag === "searching") {
      // Pulsing radar antenna
      const wave = (tick % 4 === 0) ? "(((o)))" : (tick % 4 === 1) ? " ((o)) " : (tick % 4 === 2) ? "  (o)  " : "   o   ";
      propRows = [
        ` ${wave} `,
        "    |    ",
        "  --+--  ",
        "    |    ",
        "   / \\   ",
        "  '   '  ",
      ];
      armR = "\\--";
    } else if (tag === "success") {
      // Fist pump & sparkles
      const s1 = (tick % 2 === 0) ? "★" : "✦";
      const s2 = (tick % 2 === 0) ? "✦" : "★";
      propRows = [
        `  ${s1}   ${s2}  `,
        "   (o)   ",
        "   /|\\   ",
        "    |    ",
        "  --+--  ",
        "         ",
      ];
      armR = "^--";
    } else if (tag === "failure") {
      // Shrug / facepalm
      sideL = " \\/ ///// ";
      sideR = " \\\\\\\\ \\/";
      propRows = [
        "   ???   ",
        "  \\_|_/  ",
        "         ",
        "         ",
        "         ",
        "         ",
      ];
    } else if (tag === "waiting-user") {
      const waveHand = (tick % 4 < 2) ? "\\ o /" : "/ o \\";
      propRows[0] = `  ${waveHand}  `;
      propRows[1] = "   \\|/   ";
      propRows[2] = "    |    ";
      armR = "/--";
    }

    const hoodie = [
      `     /---+-------+---\\   `,
      `    /+++++-------+++++\\  `,
      `  /  ///// |   | \\\\\\\\  \\ `,
      `${sideL} |OMO| ${sideR}`,
      `${foldL}${stringL}|   |${stringR}${foldR}`,
      ` | |   +-----------+ \\ | `,
      `${armL}|           |  ${armR}`,
      `${cuffL}+-----------+${cuffR}`,
      `${handL}\\___________/${handR}`,
    ];

    return { hoodie, propRows };
  }

  // Baggy pants and chunky skate sneakers with foot tapping (25 chars)
  function getLegs(tag, tick, flourish) {
    let starL = "*", starR = "*";
    // Continuous rhythmic beat tapping
    if (tag === "idle") {
      if (flourish === "foot_tap" || tick % 12 < 6) {
        starR = "+";
      } else {
        starL = "+";
      }
    } else if (tag === "success") {
      starL = (tick % 2 === 0) ? "★" : "*";
      starR = (tick % 2 === 0) ? "*" : "★";
    }

    return [
      `        /   |   \\        `,
      `       /    |    \\       `,
      `      |  /\\ | /\\  |      `,
      `      |_____|_____|      `,
      `      /-----\\ /-----\\    `,
      `     (   ${starL}   ) (   ${starR}   ) `,
    ];
  }

  const PROP_EMPTY = "         "; // 9 spaces

  // Assemble the complete character frame and all live telemetry matrices
  function renderFrame() {
    frameCount++;
    const tick = frameCount;

    // Idle action sequencer: trigger flourishes rapidly (~every 2.5 - 3.5 seconds)
    if (currentTag === "idle") {
      if (!activeFlourish) {
        idleTimer++;
        if (idleTimer > 28 && Math.random() < 0.16) {
          const list = ["adjust_glasses", "head_scratch", "wave", "stretch", "foot_tap", "thumbs_up", "fidget"];
          activeFlourish = list[Math.floor(Math.random() * list.length)];
          flourishTick = 0;
          idleTimer = 0;
        }
      } else {
        flourishTick++;
        const duration = (activeFlourish === "stretch") ? 26 : 20;
        if (flourishTick >= duration) {
          activeFlourish = null;
          flourishTick = 0;
          idleTimer = 0;
        }
      }
    } else {
      activeFlourish = null;
      idleTimer = 0;
      flourishTick = 0;
    }

    const isGlitch = (currentTag === "failure" && tick % 2 === 0);
    const hair = getHair(tick, currentTag, isGlitch);
    const face = getFace(currentTag, tick, activeFlourish, flourishTick);
    const { hoodie, propRows } = getHoodieAndProps(currentTag, tick, activeFlourish, flourishTick);
    const legs = getLegs(currentTag, tick, activeFlourish);

    // Compose figure rows with fixed-width prop gutter (34 chars per row, 27 rows total)
    const lines = [];
    hair.forEach(h => lines.push(h + PROP_EMPTY));
    face.forEach(fc => lines.push(fc + PROP_EMPTY));
    hoodie.forEach((hd, i) => {
      const pIdx = i - 3;
      const p = (pIdx >= 0 && pIdx < propRows.length && propRows[pIdx]) ? propRows[pIdx] : PROP_EMPTY;
      lines.push(hd + p);
    });
    legs.forEach(l => lines.push(l + PROP_EMPTY));

    targetEl.textContent = lines.join("\n");

    // Dynamic x86_64 disassembly live flank (27 rows matching Omo's height)
    if (flankLeftEl) {
      const flankOffset = Math.floor(tick / 4) % BASE_OPCODES.length;
      const leftLines = [];
      for (let i = 0; i < 27; i++) {
        leftLines.push(BASE_OPCODES[(flankOffset + i) % BASE_OPCODES.length]);
      }
      flankLeftEl.textContent = leftLines.join("\n");
    }

    // Dynamic memory hex dump live flank (27 rows matching Omo's height)
    if (flankRightEl) {
      const hexOffset = Math.floor(tick / 5) % BASE_HEX.length;
      const rightLines = [];
      for (let i = 0; i < 27; i++) {
        rightLines.push(BASE_HEX[(hexOffset + i) % BASE_HEX.length]);
      }
      flankRightEl.textContent = rightLines.join("\n");
    }

    // Dynamic ASCII Waveform Visualizer in Top HUD Bar
    if (waveformEl) {
      let waveStr = "";
      for (let w = 0; w < 16; w++) {
        const val = Math.sin((tick * 0.22) + (w * 0.45)) * Math.cos((tick * 0.09) - (w * 0.3));
        const idx = Math.floor(((val + 1) / 2) * (WAVE_BARS.length - 1));
        waveStr += WAVE_BARS[Math.max(0, Math.min(WAVE_BARS.length - 1, idx))];
      }
      waveformEl.textContent = waveStr;
    }

    // Live Instruction Pointer & CPU Registers
    if (ripStreamEl) {
      const rip = (0x00492B00 + (tick % 64) * 4).toString(16).toUpperCase();
      ripStreamEl.textContent = `├──[ RIP: 0x00007FFF${rip} // CS: 0x0033 // SS: 0x002B // RFLAGS: [IF,ZF,PF,AF] ]──┤`;
    }

    if (regStreamEl) {
      const rax = (0x1000 + (tick % 16) * 0x10).toString(16).toUpperCase();
      const rcx = (0x0040 + (tick % 32)).toString(16).toUpperCase();
      const rdx = (0x2000 + (tick % 8) * 0x80).toString(16).toUpperCase();
      const rsi = (0x0010 + (tick % 4)).toString(16).toUpperCase();
      regStreamEl.textContent = `├──[ RAX:0x${rax} RBX:0x7FFE RCX:0x${rcx} RDX:0x${rdx} RSI:0x${rsi} RDI:0x0001 R8:0x0004 R9:0x0008 ]──┤`;
    }

    if (controlRegsEl) {
      const rsp = (0xDE80 - (tick % 8) * 8).toString(16).toUpperCase();
      controlRegsEl.textContent = `└──[ RSP: 0x7FFFFFFF${rsp}  RBP: 0x7FFFFFFFDEC0  CR0: 0x80050033  CR3: 0x00102000 ]──┘`;
    }

    // Dynamic Left Panel: Quad Core Load Gauges & System Telemetry
    if (sensorEl) {
      const c0 = Math.floor(62 + Math.sin(tick * 0.15) * 16);
      const c1 = Math.floor(48 + Math.cos(tick * 0.18) * 14);
      const c2 = Math.floor(75 + Math.sin(tick * 0.12) * 18);
      const c3 = Math.floor(34 + Math.cos(tick * 0.22) * 12);
      const makeBar = (val) => {
        const filled = Math.round((val / 100) * 10);
        return "█".repeat(filled) + "░".repeat(10 - filled);
      };
      sensorEl.textContent = [
        `CORE_0 [${makeBar(c0)}] ${c0}% 42°C  i5-6500T @ 2.50GHz`,
        `CORE_1 [${makeBar(c1)}] ${c1}% 41°C  zen1 / AVX2 / FMA3`,
        `CORE_2 [${makeBar(c2)}] ${c2}% 45°C  Governor: schedutil`,
        `CORE_3 [${makeBar(c3)}] ${c3}% 39°C  LoadAvg: 0.62 0.55`,
        `GPU    [██████░░░░] 54% VAAPI i915 (HD 530 Mesa)`,
        `RAM    [████████░░] 4.9G / 7.6G  Swap: 116M`,
        `AUDIO  PipeWire 1.4.1 [48KHz 64smp 1.3ms UMC22]`,
      ].join("\n");
    }

    // Dynamic Left Panel: Sockets & IPC Matrix
    if (socketEl) {
      socketEl.textContent = [
        "TCP  127.0.0.1:8795    LISTEN    omo-terminal",
        "TCP  127.0.0.1:8792    LISTEN    omocrisismon",
        "TCP  127.0.0.1:8788    LISTEN    omoclaude",
        "UNIX /tmp/hypr/sock2   ACTIVE    hypr.socket2",
        "UNIX /run/user/pipew-0 ACTIVE    pipewire-0",
      ].join("\n");
    }

    // Dynamic Right Panel: AGY Stream Pipeline & Token Metrics
    if (engineEl) {
      const tok = (74 + Math.sin(tick * 0.3) * 12).toFixed(1);
      const ctxBar = "████████░░░░░░░░";
      engineEl.textContent = [
        "ENGINE : Google Antigravity (stream-json)",
        "MODEL  : Gemini 3.8 Flash (High)",
        "STATUS : ONLINE [BUFFER ACTIVE 12.5 FPS]",
        `TPUT   : ${tok} tok/s  [AVG: 81.2]  LAT: 1.3ms`,
        `CTX    : [${ctxBar}] 38.4k / 1.0M`,
        "PARAMS : TEMP=0.70  TOP_P=0.95  TOP_K=40",
      ].join("\n");
    }

    // Dynamic Right Panel: Syscall & eBPF Trace Stream (scrolls live)
    if (traceEl) {
      const traceOffset = Math.floor(tick / 3) % SYSCALL_TRACE.length;
      const traceLines = [];
      for (let t = 0; t < 5; t++) {
        traceLines.push(SYSCALL_TRACE[(traceOffset + t) % SYSCALL_TRACE.length]);
      }
      traceEl.textContent = traceLines.join("\n");
    }
  }

  function play(tag) {
    currentTag = tag || "idle";
  }

  function start() {
    if (!animTimer) {
      animTimer = setInterval(renderFrame, 80); // ~12.5 fps smooth ASCII animation
    }
  }

  function stop() {
    if (animTimer) {
      clearInterval(animTimer);
      animTimer = null;
    }
  }

  start();

  window.OmoMascot = {
    play: play,
    start: start,
    stop: stop,
  };
})();
