#py_utils/currency_utils.py

import locale
from flask import Flask

app = Flask(__name__)

def format_money(number):
    if number is None:
        return "--"
    else:
        rounded_number = round(number, 2)  # Round to two decimal places
        # Format the number with a $ sign and handle negative values
        if rounded_number < 0:
            return f"-${abs(rounded_number):,}"  # Add $ after the negative sign
        return f"${rounded_number:,}"  # Format for positive numbers

def format_money_whole(number):
    if number is None:
        return "--"
    else:
        rounded_number = round(number)  # Round to whole number
        # Format the number with a $ sign and handle negative values
        if rounded_number < 0:
            return f"-${abs(rounded_number):,}"  # Add $ after the negative sign
        return f"${rounded_number:,}"  # Format for positive numbers

def format_currency(value):
    # Convert value to float
    value = float(value)

    # Check if the value is negative
    is_negative = value < 0

    # Format the value as currency without parentheses
    formatted_value = locale.currency(abs(value), grouping=True)

    # Add the negative sign if necessary
    if is_negative:
        formatted_value = "-" + formatted_value

    return formatted_value

# Register custom filters with the Jinja2 environment
app.jinja_env.filters['tocurrency'] = format_money
app.jinja_env.filters['tocurrency_whole'] = format_money_whole