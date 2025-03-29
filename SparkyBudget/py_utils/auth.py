#py_utils/auth.py

import os
from flask import request, redirect, url_for, session, render_template
from flask_login import login_user, logout_user, current_user, login_required, UserMixin
from datetime import timedelta  # Ensure this line is included

# Simple hardcoded user class (replace with your user model if you have one)
class User(UserMixin):
    def __init__(self, user_id):
        self.id = user_id

sparky_username = os.getenv("SPARKY_USER", "Sparky")
sparky_password = os.getenv("SPARKY_PASS", "Sparky")

def load_user(user_id):
    return User(user_id)

def login():
    print("Login route reached.")
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        if username == sparky_username and password == sparky_password:
            user = User(username)
            login_user(user)
            session["user"] = sparky_username
            session.permanent = True  # Make the session permanent
            print(f"User {username} successfully logged in.")
            return redirect(url_for("home.index"))  # Correct the endpoint reference
    return render_template("login.html.jinja")

def logout():
    logout_user()
    return redirect(url_for("login"))

def before_request(app):
    session.permanent = True
    app.permanent_session_lifetime = timedelta(days=1)  # Ensure this line is included
    if current_user.is_authenticated:
        session["user"] = current_user.id

def unauthorized():
    # Redirect the user to the login page when unauthorized
    return redirect(url_for("login"))