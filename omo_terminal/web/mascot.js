/**
 * Omo ASCII Mascot Engine: High-density code-composed character with procedural animation.
 * Replicates the reference art: code hair, swirl glasses, hoodie, code sneakers, and held props.
 */
(function() {
  "use strict";

  const targetEl = document.getElementById("omo-art");
  if (!targetEl) return;
  const flankLeftEl = document.getElementById("flank-left-code");
  const flankRightEl = document.getElementById("flank-right-code");
  const regStreamEl = document.getElementById("hud-reg-stream");

  let currentTag = "idle";
  let frameCount = 0;
  let animTimer = null;

  // Code symbols for glyph shimmers
  const HAIR_GLYPHS = [".", "*", "$", "/", "\\", "%", "!", "<", ">", "+", "="];

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

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  let idleTimer = 0;
  let activeFlourish = null;
  let flourishTick = 0;

  // Generate dynamic code hair with subtle glyph shimmer & failure glitch (exactly 25 chars per row)
  function getHair(tick, tag, isGlitch) {
    const s1 = HAIR_GLYPHS[(tick) % HAIR_GLYPHS.length];
    const s2 = HAIR_GLYPHS[(tick + 3) % HAIR_GLYPHS.length];
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

    const isBlink = (tick % 36 === 0 || tick % 36 === 1);

    if (tag === "idle") {
      if (flourish === "adjust_glasses") {
        // Hand reaches up to glasses temple
        if (fTick >= 8 && fTick <= 16) {
          browL = "(.)|"; // Left hand adjusting glasses!
          eyeL = "(─)"; eyeR = "(─)"; // squints slightly while adjusting
          mouth = "\\___/";
        } else {
          eyeL = "(@)"; eyeR = "(@)";
        }
      } else if (flourish === "head_scratch") {
        eyeL = "(^)"; eyeR = "(@)"; // looks up while scratching
        mouth = " .o. "; // whistle
      } else if (flourish === "wave") {
        eyeL = (fTick % 12 < 6) ? "(─)" : "(@)"; // playful wink!
        eyeR = "(@)";
        mouth = "\\===/"; // big friendly grin
      } else if (flourish === "stretch") {
        if (fTick >= 6 && fTick <= 20) {
          eyeL = "(─)"; eyeR = "(─)"; // eyes closed in yawn
          mouth = " (O) "; // yawn
        } else {
          eyeL = "(@)"; eyeR = "(@)";
          mouth = "\\___/";
        }
      } else {
        // Ambient natural idle: blinking & saccades
        if (isBlink) {
          eyeL = "(─)"; eyeR = "(─)";
        } else {
          const sCycle = tick % 90;
          if (sCycle >= 25 && sCycle < 38) {
            eyeL = "(>)"; eyeR = "(>)"; // glance right
          } else if (sCycle >= 60 && sCycle < 73) {
            eyeL = "(<)"; eyeR = "(<)"; // glance left
          } else {
            eyeL = "(@)"; eyeR = "(@)";
          }
        }
      }
    } else if (tag === "thinking") {
      const tPhase = tick % 30;
      if (tPhase < 12) {
        eyeL = "(^)"; eyeR = "(^)";
        mouth = ".-~-.";
      } else if (tPhase < 22) {
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

      eyeL = (tick % 24 < 12) ? "(@)" : "(^)";
      eyeR = eyeL;
    } else if (tag === "shell" || tag === "testing") {
      eyeL = (tick % 6 < 3) ? "(=)" : "(v)";
      eyeR = eyeL;
      mouth = (tick % 8 < 4) ? "\\===/" : " --- ";
    } else if (tag === "reading") {
      eyeL = "(>)"; eyeR = "(>)";
      mouth = "\\___/";
      if (tick % 40 >= 20 && tick % 40 <= 28) {
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
      eyeL = (tick % 30 < 20) ? "(o)" : "(@)";
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
        if (fTick < 6) {
          sideL = " |  ////| ";
          foldL = " | /   /  ";
          cuffL = " [===] ";
        } else if (fTick <= 18) {
          sideL = " |  /// | ";
          foldL = " | /  /   ";
          armL  = " | | / ";
          cuffL = "   |   ";
          handL = "   |   ";
        }
      } else if (flourish === "head_scratch") {
        // Right arm scratches hair
        if (fTick >= 4 && fTick <= 20) {
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
      } else if (flourish === "stretch") {
        // Both arms stretched up
        sideL = " |/ ///// ";
        foldL = " / /      ";
        sideR = " \\\\\\\\ \\|";
        foldR = "     \\ \\";
        propRows[0] = " \\ o /   ";
        propRows[1] = "  \\|/    ";
      }
    } else if (tag === "thinking") {
      // The Thinker: right hand cupping chin
      sideR = " \\\\  / |";
      foldR = "  \\\\/  |";
      armR = "/ |";
      handR = "     ";
      const tap = (tick % 6 < 3) ? " ( . )" : " (|. )";
      propRows[0] = tap + "   ";
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
      // Both hands typing on mini terminal
      const cur = (tick % 2 === 0) ? "█" : " ";
      const t1 = (tick % 4 < 2) ? "[o]" : "[-]";
      const t2 = (tick % 4 >= 2) ? "[o]" : "[-]";
      propRows = [
        " .-----. ",
        `| >_${cur}   |`,
        `|${t1}${t2}| `,
        " '-----' ",
        " [=====] ",
        "         ",
      ];
      armR = "\\--";
    } else if (tag === "reading") {
      // Inspecting glowing document
      const bars = (tick % 3 === 0) ? "[====]" : "[≡≡≡≡]";
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
      // Etching stylus with flying sparks
      const spark = (tick % 3 === 0) ? "✦" : (tick % 3 === 1) ? "·" : " ";
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
      `${foldL} |   | ${foldR}`,
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
    if (tag === "idle") {
      if (flourish === "foot_tap" || (tick % 50 >= 25)) {
        if (tick % 8 < 4) starR = "+";
        else starL = "+";
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

  // Assemble the complete character frame
  function renderFrame() {
    frameCount++;
    const tick = frameCount;

    // Idle action sequencer: trigger a fun flourish every 60-80 frames (~5-7s)
    if (currentTag === "idle") {
      if (!activeFlourish) {
        idleTimer++;
        if (idleTimer > 60 && Math.random() < 0.08) {
          const list = ["adjust_glasses", "head_scratch", "wave", "stretch", "foot_tap"];
          activeFlourish = list[Math.floor(Math.random() * list.length)];
          flourishTick = 0;
          idleTimer = 0;
        }
      } else {
        flourishTick++;
        const duration = (activeFlourish === "stretch") ? 32 : 24;
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

    // Breathing heave (subtle 1-space shift every 14 frames)
    const breath = (Math.floor(tick / 14) % 2 === 0) ? " " : "";

    // Compose figure rows with fixed-width prop gutter (34 chars per row, 27 rows total)
    const lines = [];
    hair.forEach(h => lines.push(breath + h + PROP_EMPTY));
    face.forEach(fc => lines.push(breath + fc + PROP_EMPTY));
    hoodie.forEach((hd, i) => {
      const pIdx = i - 3;
      const p = (pIdx >= 0 && pIdx < propRows.length && propRows[pIdx]) ? propRows[pIdx] : PROP_EMPTY;
      lines.push(breath + hd + p);
    });
    legs.forEach(l => lines.push(breath + l + PROP_EMPTY));

    targetEl.textContent = lines.join("\n");

    // Dynamic x86_64 disassembly live flank (27 rows matching Omo's height)
    if (flankLeftEl) {
      const flankOffset = Math.floor(tick / 5) % BASE_OPCODES.length;
      const leftLines = [];
      for (let i = 0; i < 27; i++) {
        leftLines.push(BASE_OPCODES[(flankOffset + i) % BASE_OPCODES.length]);
      }
      flankLeftEl.textContent = leftLines.join("\n");
    }

    // Dynamic memory hex dump live flank (27 rows matching Omo's height)
    if (flankRightEl) {
      const hexOffset = Math.floor(tick / 7) % BASE_HEX.length;
      const rightLines = [];
      for (let i = 0; i < 27; i++) {
        rightLines.push(BASE_HEX[(hexOffset + i) % BASE_HEX.length]);
      }
      flankRightEl.textContent = rightLines.join("\n");
    }

    // Live CPU register HUD stream
    if (regStreamEl) {
      const rax = (0x1000 + (tick % 16) * 0x10).toString(16).toUpperCase();
      const rcx = (0x0040 + (tick % 32)).toString(16).toUpperCase();
      const rdx = (0x2000 + (tick % 8) * 0x80).toString(16).toUpperCase();
      regStreamEl.textContent = `└──[ REG: RAX=0x${rax} RBX=0x7FFE RCX=0x${rcx} RDX=0x${rdx} ]`;
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
