//static/js/recurring_budget_details.js
// Add any interactivity or functionality for the recurring budget details page here

// Example: Highlight rows on hover
document.addEventListener("DOMContentLoaded", function () {
    const rows = document.querySelectorAll(".recurring-budget-container table tbody tr");
    rows.forEach(row => {
        row.addEventListener("mouseenter", () => {
            row.style.backgroundColor = "#d1ecf1";
        });
        row.addEventListener("mouseleave", () => {
            row.style.backgroundColor = "";
        });
    });
});

$(document).ready(function () {
    // Fetch subcategories using an AJAX request
    $.get('/getDistinctSubcategories', function (subcategories) {
        if (subcategories && subcategories.length > 0) {
            // Format the data for select2
            const formattedSubcategories = subcategories.map(subcategory => ({
                id: subcategory,
                text: subcategory
            }));

            // Initialize the select2 dropdown with a custom width
            $('#subCategoryInput').select2({
                data: formattedSubcategories,
                width: '40%', // Set the width to 40%
                placeholder: 'Select or type to search',
                allowClear: true,
            });
        } else {
            console.error('No subcategories found.');
            alert('No subcategories available to populate the dropdown.');
        }
    }).fail(function (error) {
        console.error('Error fetching subcategories:', error);
        alert('An error occurred while fetching subcategories.');
    });
});

// Function to delete a recurring budget record
function deleteRecurringBudget(subCategory) {
    if (confirm(`Are you sure you want to delete the recurring budget for ${subCategory}?`)) {
        // Send a DELETE request to the server
        fetch(`/delete_recurring_budget`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ subCategory: subCategory }),
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    // Refresh the table by reloading the page
                    location.reload();
                } else {
                    alert(`Error: ${data.message}`);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while deleting the recurring budget.');
            });
    }
}



// Function to handle form submission
function addRecurringBudget() {
    // Get the form data
    const subCategory = $('#subCategoryInput').val();
    const budgetAmount = $('#budgetAmountInput').val();

    // Validate the form data
    if (!subCategory || !budgetAmount) {
        alert('Please fill out all fields.');
        return;
    }

    // Send the data to the server
    fetch('/add_recurring_budget', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            subCategory: subCategory,
            budgetAmount: parseFloat(budgetAmount),
        }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                // Refresh the table
                location.reload();
            } else {
                alert(`Error: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while adding the recurring budget.');
        });
}

