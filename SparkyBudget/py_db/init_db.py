import os
import sqlite3
import logging
from flask import current_app

logger = logging.getLogger(__name__)

def initialize_database():
    """
    Checks if the database exists and initializes it if necessary.
    """
    db_dir = os.path.dirname(current_app.config['DATABASE_PATH'])
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)

    if not os.path.exists(current_app.config['DATABASE_PATH']):
        logger.info("Database not found. Initializing database...")
        try:
            conn = sqlite3.connect(current_app.config['DATABASE_PATH'])
            cursor = conn.cursor()

            # Get the directory of the current file (init_db.py)
            current_dir = os.path.dirname(__file__)
            db_scripts_dir = os.path.join(current_dir, 'db_scripts')

            # Read and execute DDL script
            ddl_script_path = os.path.join(db_scripts_dir, 'SparkyBudget_DDL.sql')
            with open(ddl_script_path, 'r') as f:
                sql_script_ddl = f.read()
                cursor.executescript(sql_script_ddl)

            # Read and execute DML script
            dml_script_path = os.path.join(db_scripts_dir, 'SparkyBudget_DML.sql')
            with open(dml_script_path, 'r') as f:
                sql_script_dml = f.read()
                cursor.executescript(sql_script_dml)

            # Check for SPARKY_DEMO environment variable and execute demo script if set to 'Yes'
            sparky_demo = os.getenv("SPARKY_DEMO")
            if sparky_demo and sparky_demo.lower() == 'yes':
                logger.info("SPARKY_DEMO is set to 'Yes'. Executing demo data script...")
                demo_script_path = os.path.join(db_scripts_dir, 'SparkyBudget_Demo.sql')
                if os.path.exists(demo_script_path):
                    with open(demo_script_path, 'r') as f:
                        sql_script_demo = f.read()
                        cursor.executescript(sql_script_demo)
                    logger.info("Demo data script executed successfully.")
                else:
                    logger.warning(f"Demo data script not found at {demo_script_path}")

            conn.commit()
            conn.close()
            logger.info("Database initialized successfully.")
        except Exception as e:
            logger.error(f"Error initializing database: {e}")
            # Depending on desired behavior, you might want to re-raise the exception
            # raise