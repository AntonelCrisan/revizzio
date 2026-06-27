import logging

import uvicorn

from app.main import app

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )

    logging.getLogger("revizzio").info("Pornesc Revizzio API pe http://127.0.0.1:8000")
    logging.getLogger("revizzio").info("Documentatia API: http://127.0.0.1:8000/docs")

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        log_level="info",
        access_log=True,
    )
