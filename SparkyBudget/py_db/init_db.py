import os
import sqlite3
import logging
from flask import current_app

logger = logging.getLogger(__name__)

def initialize_database():
    """
    Checks if the database exists and initializes/upgrades it if necessary.
    """
    db_dir = os.path.dirname(current_app.config['DATABASE_PATH'])
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)

    db_exists = os.path.exists(current_app.config['DATABASE_PATH'])
    conn = None
    current_version = None # Initialize current_version outside try block

    try:
        conn = sqlite3.connect(current_app.config['DATABASE_PATH'])
        cursor = conn.cursor()

        if not db_exists:
            logger.info("Database file not found. Initializing database...")
            # Get the directory of the current file (init_db.py)
            current_dir = os.path.dirname(__file__)
            db_scripts_dir = os.path.join(current_dir, 'db_scripts')

            # Read and execute DDL script
            ddl_script_path = os.path.join(db_scripts_dir, 'SparkyBudget_DDL.sql')
            if os.path.exists(ddl_script_path):
                with open(ddl_script_path, 'r') as f:
                    sql_script_ddl = f.read()
                    cursor.executescript(sql_script_ddl)
                logger.info("DDL script executed.")
            else:
                 logger.error(f"DDL script not found at {ddl_script_path}")
                 raise FileNotFoundError(f"DDL script not found at {ddl_script_path}")


            # Read and execute DML script
            dml_script_path = os.path.join(db_scripts_dir, 'SparkyBudget_DML.sql')
            if os.path.exists(dml_script_path):
                with open(dml_script_path, 'r') as f:
                    sql_script_dml = f.read()
                    cursor.executescript(sql_script_dml)
                logger.info("DML script executed.")
            else:
                 logger.warning(f"DML script not found at {dml_script_path}. Skipping DML execution.")


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
            logger.info("Database initialized successfully.")            

        else:
            logger.info("Database file found. Checking version...")
            try:
                # Check if D_DB table exists
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='D_DB'")
                if cursor.fetchone():
                    # Table exists, get version
                    cursor.execute("SELECT DB_VERSION FROM D_DB ORDER BY rowid DESC LIMIT 1")
                    version_row = cursor.fetchone()
                    if version_row:
                        current_version = version_row[0]
                        logger.info(f"Existing database version: {current_version}")
                    else:
                        # Table exists but no version found, assume old and set to v0.17
                        logger.warning("D_DB table found but no version entry. Assuming old version and setting to v0.17")
                        cursor.execute("INSERT INTO D_DB (DB_VERSION) VALUES (?)", ('v0.17',))
                        conn.commit()
                        current_version = 'v0.17'
                        logger.info(f"Database version set to {current_version}")
                else:
                    # D_DB table does not exist, assume very old and set to v0.17
                    logger.warning("D_DB table not found. Assuming very old version and setting to v0.17")
                    cursor.execute("CREATE TABLE D_DB (DB_VERSION TEXT)")
                    cursor.execute("INSERT INTO D_DB (DB_VERSION) VALUES (?)", ('v0.17',))
                    conn.commit()
                    current_version = 'v0.17'
                    logger.info(f"Database version set to {current_version}")

            except Exception as e:
                logger.error(f"Error checking database version: {e}")
                # If we can't get the version, we can't upgrade safely.
                raise # Stop here if version check fails

        # Now handle upgrades if current_version is determined (moved outside the else block)
        if current_version:
            logger.info("Checking for database upgrades...")
            upgrade_scripts_dir = os.path.join(os.path.dirname(__file__), 'db_scripts', 'upgrade')
            if os.path.exists(upgrade_scripts_dir):
                upgrade_files = [f for f in os.listdir(upgrade_scripts_dir) if f.endswith('.sql')]

                # Filter and sort upgrade files
                def extract_version(filename):
                    """Extracts the version string (e.g., '0.14', '1') from the filename."""
                    name_without_ext = filename.replace('.sql', '')
                    # Find the last occurrence of '_v'
                    v_index = name_without_ext.rfind('_v')
                    if v_index != -1:
                        # Return the part after '_v'
                        return name_without_ext[v_index + 2:]
                    return None

                def version_tuple(version_str):
                    """Converts a version string (e.g., 'v0.14', '0.14', 'v1') to a tuple of integers for comparison."""
                    if version_str:
                        # Remove leading 'v' if it exists
                        if version_str.startswith('v'):
                            version_str = version_str[1:]
                        try:
                            # Split by '.' and convert to integers
                            return tuple(map(int, version_str.split('.')))
                        except ValueError:
                            logger.warning(f"Invalid version number format in string: {version_str}")
                            return (0,) # Handle invalid version strings
                    logger.warning(f"Missing version string.")
                    return (0,) # Handle None or empty strings

                current_version_tuple = version_tuple(current_version)
                logger.debug(f"Current version tuple: {current_version_tuple}")

                relevant_upgrade_files = []
                for filename in upgrade_files:
                    logger.debug(f"Processing upgrade file: {filename}")
                    file_version_str = extract_version(filename)
                    if file_version_str:
                        file_version_tuple = version_tuple(file_version_str) # Use the corrected version_tuple
                        logger.debug(f"File: {filename}, Extracted version string: {file_version_str}, Version tuple: {file_version_tuple}")
                        if file_version_tuple > current_version_tuple:
                            logger.debug(f"File version {file_version_tuple} is newer than current version {current_version_tuple}. Adding to relevant files.")
                            relevant_upgrade_files.append((file_version_tuple, filename))
                        else:
                            logger.debug(f"File version {file_version_tuple} is not newer than current version {current_version_tuple}. Skipping.")
                    else:
                        logger.warning(f"Could not extract version from filename: {filename}. Skipping.")

                relevant_upgrade_files.sort() # Sorts by version tuple

                if relevant_upgrade_files:
                    logger.info(f"Found {len(relevant_upgrade_files)} upgrade scripts to execute.")
                    for version_tuple, filename in relevant_upgrade_files:
                        script_path = os.path.join(upgrade_scripts_dir, filename)
                        logger.info(f"Executing upgrade script: {filename}")
                        try:
                            with open(script_path, 'r') as f:
                                sql_script = f.read()
                                cursor.executescript(sql_script)
                            conn.commit()


                        except Exception as e:
                            logger.error(f"Error executing upgrade script {filename}: {e}")
                            conn.rollback() # Rollback changes from this script
                            raise # Stop upgrade process on error

                    logger.info("Database upgrade process completed.")
                else:
                    logger.info("No database upgrade scripts found or none are newer than the current version.")
            else:
                logger.warning(f"Upgrade scripts directory not found at {upgrade_scripts_dir}. Skipping upgrade check.")


    except Exception as e:
        logger.error(f"An error occurred during database initialization or upgrade: {e}")
        if conn:
            conn.rollback() # Ensure any pending transaction is rolled back
        # Re-raise the exception to indicate failure
        raise
    finally:
        if conn:
            conn.close()