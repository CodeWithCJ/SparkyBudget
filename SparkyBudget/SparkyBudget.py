import locale, os, logging
from datetime import timedelta
from datetime import datetime
from threading import Lock
from flask import Flask, jsonify  
from flask_login import LoginManager, login_required


# Get log level from environment, default to INFO if not set
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=log_level,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler()  # Logs to the console
    ]
)
logger = logging.getLogger(__name__)

# py_utils
from py_utils.auth import load_user, login, logout, before_request, unauthorized
from py_utils.currency_utils import app as currency_app
from py_utils.manage_categories import manage_categories_bp
from py_utils.SimpleFinToDB import process_accounts_data
from py_utils.subcategory_update import subcategory_update_bp

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
    #app.secret_key = secrets.token_hex(16)
    app.secret_key = os.getenv("FLASK_SECRET_KEY", "your-very-secure-key")
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

    logger.info(f"SparkyBudget started at {datetime.now()}")
    #start_scheduler()
    # Run Flask app
    app.run(host="0.0.0.0", port=5000, ssl_context=ssl_context, debug=True)