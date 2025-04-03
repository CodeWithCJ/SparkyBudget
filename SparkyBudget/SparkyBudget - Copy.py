#SparkyBudget.py

import locale, os, secrets, logging, schedule, time
from datetime import timedelta, datetime  # Added datetime
from threading import Lock
from threading import Thread
from flask import Flask, jsonify
from flask_login import LoginManager, login_required

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# py_utils
from py_utils.auth import load_user, login, logout, before_request, unauthorized
from py_utils.currency_utils import app as currency_app
from py_utils.manage_categories import manage_categories_bp
#from py_utils.scheduler import start_scheduler
from py_utils.subcategory_update import subcategory_update_bp

#p py_utils for scheduler
from py_utils.monthly_budget_insert import month_budget_update_using_template
from py_utils.daily_balance_history import daily_balance_history_insert
from py_utils.SimpleFinToDB import process_accounts_data

# py_routes
from py_routes.home import home_bp
from py_routes.budget_summary import budget_sumary_bp
from py_routes.historical_trend import historical_trend_bp


def create_app():
    app = Flask(__name__, template_folder='./templates', static_folder='./static')
    app.jinja_env.add_extension("jinja2.ext.loopcontrols")
    app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=1)
    app.config["SESSION_COOKIE_SECURE"] = bool(int(os.getenv("USE_INTERNAL_HTTPS", 0))) or bool(
        int(os.getenv("USE_SECURE_SESSION_COOKIE", 1))
    )
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.secret_key = secrets.token_hex(16)
    login_manager = LoginManager(app)
    return app, login_manager

app, login_manager = create_app()

# Update Jinja2 environment
app.jinja_env.filters.update(currency_app.jinja_env.filters)

login_manager.user_loader(load_user)
login_manager.unauthorized_handler(unauthorized)

app.before_request(lambda: before_request(app))

app.route("/login", methods=["GET", "POST"])(login)
app.route("/logout", methods=["GET", "POST"])(logout)

# Register blueprints
app.register_blueprint(home_bp)
app.register_blueprint(budget_sumary_bp)
app.register_blueprint(historical_trend_bp)
app.register_blueprint(manage_categories_bp)
app.register_blueprint(subcategory_update_bp)

db_lock = Lock()

locale.setlocale(locale.LC_ALL, "")



def start_scheduler():
    def run_scheduler():
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute

    scheduler_thread = Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()
    return scheduler_thread

def run_with_error_handling(task_name, func):
    """Wrapper to handle errors in scheduled tasks"""
    try:
        logger.info(f"Running {task_name} at {datetime.now()}")
        func()
        logger.info(f"Completed {task_name} successfully")
    except Exception as e:
        logger.error(f"Error in {task_name}: {str(e)}", exc_info=True)


schedule.every().day.at("01:00").do(
        lambda: run_with_error_handling("Monthly Budget Update", month_budget_update_using_template)
    )
schedule.every().day.at("23:55").do(
    lambda: run_with_error_handling("Daily Balance History", daily_balance_history_insert)
)
schedule.every(4).hours.do(
    lambda: run_with_error_handling("Account Data Processing", process_accounts_data)
)
# For testing: Uncomment to check if scheduler runs
schedule.every(1).minutes.do(
    lambda: run_with_error_handling("Test Job", process_accounts_data)
)


@app.route("/download_data", methods=["POST"])
@login_required
def download_data():
    try:
        process_accounts_data()
        return jsonify({"success": True, "message": "Sync with Bank Successfully."})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

if __name__ == "__main__":
    ssl_context = None
    if bool(int(os.getenv("USE_INTERNAL_HTTPS", 0))):
        ssl_context = (r"certs/cert.pem", r"certs/key.pem")

    # Start the scheduler in a separate thread
    scheduler_thread = start_scheduler()
    logger.info(f"Scheduler thread initialized - Alive: {scheduler_thread.is_alive()}")

    

    # Run Flask app
    app.run(host="0.0.0.0", port=5001, ssl_context=ssl_context, debug=False, use_reloader=False)