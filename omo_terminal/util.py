"""Small shared helpers for omo-terminal."""
from __future__ import annotations

import asyncio
import shutil
import socket
import subprocess
from contextlib import closing


def which(*names: str) -> str | None:
    """Return the first of ``names`` found on PATH."""
    for name in names:
        found = shutil.which(name)
        if found:
            return found
    return None


def port_open(host: str, port: int, timeout: float = 1.0) -> bool:
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        sock.settimeout(timeout)
        return sock.connect_ex((host, port)) == 0


async def wait_for_port(
    host: str, port: int, timeout: float, interval: float = 0.5
) -> bool:
    """Poll until ``host:port`` accepts connections or ``timeout`` elapses."""
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout
    while loop.time() < deadline:
        if await asyncio.to_thread(port_open, host, port, interval):
            return True
        await asyncio.sleep(interval)
    return False


def spawn_detached(argv: list[str]) -> None:
    """Launch a GUI program fully detached from this process."""
    subprocess.Popen(
        argv,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
