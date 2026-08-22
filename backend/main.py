import logging
import os

import uvicorn

from app.main import app

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )

    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))

    logging.getLogger("revizzio").info("Pornesc Reviss API pe http://%s:%s", host, port)
    logging.getLogger("revizzio").info(
        "Documentatia API: http://%s:%s/docs",
        host,
        port,
    )

    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
        access_log=True,
    )
