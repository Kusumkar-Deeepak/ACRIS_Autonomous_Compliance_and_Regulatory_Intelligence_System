import os
import socket
from urllib.parse import urlparse


def main() -> None:
    parsed = urlparse(os.getenv("REDIS_URL", "redis://localhost:6379"))
    host = parsed.hostname or "localhost"
    port = parsed.port or 6379
    with socket.create_connection((host, port), timeout=2) as connection:
        connection.sendall(b"*1\r\n$4\r\nPING\r\n")
        response = connection.recv(64)
    if b"PONG" not in response:
        raise RuntimeError("Redis did not respond to PING")


if __name__ == "__main__":
    main()
