import mysql.connector
from flask import current_app

def get_db_connection():
    cfg = current_app.config
    return mysql.connector.connect(
        host=cfg["DB_HOST"],
        user=cfg["DB_USER"],
        password=cfg["DB_PASSWORD"],
        database=cfg["DB_NAME"],
        port=cfg["DB_PORT"],
    )
