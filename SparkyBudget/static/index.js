$(document).ready(function () {
    // Fetch subcategories using an AJAX request

    $.get('/getDistinctSubcategories', function (subcategories) {
        // Clear existing options

        $('#subCategoryInput').empty();

        // Populate the Select2 dropdown with fetched subcategories
        $('#subCategoryInput').select2({
            data: subcategories,
            placeholder: 'Select or type to search',
            allowClear: true,
        });
    });
});

function toggleRow(element) {
    console.log('Toggle function called');
    var row = element.closest('tr');
    var nextRow = row.nextElementSibling;

    if (nextRow && nextRow.classList.contains('child-row')) {
        if (nextRow.style.display === 'none') {
            console.log('Expanding row');
            nextRow.style.display = '';
            element.innerHTML = '&#9660;'; // Down arrow
        } else {
            console.log('Collapsing row');
            nextRow.style.display = 'none';
            element.innerHTML = '&#9654;'; // Right arrow
        }
    } else {
        // If the next row is not a direct sibling, search in the nested tbody
        nextRow = row.parentElement.querySelector('.child-row');
        if (nextRow) {
            if (nextRow.style.display === 'none') {
                console.log('Expanding row');
                nextRow.style.display = '';
                element.innerHTML = '&#9660;'; // Down arrow
            } else {
                console.log('Collapsing row');
                nextRow.style.display = 'none';
                element.innerHTML = '&#9654;'; // Right arrow
            }
        }
    }
}

function balanceDetailsTableToggleVisibility() {
    var balanceDetailsTable = document.getElementById('balanceDetailsTable');
    var isHidden = balanceDetailsTable.classList.contains('hidden-balance-details');

    if (isHidden) {
        balanceDetailsTable.classList.remove('hidden-balance-details');
    } else {
        balanceDetailsTable.classList.add('hidden-balance-details');
    }
}




function updateBudgetKPIBoxes() {
    var container = document.getElementById("budgetSummaryKPIContainer");

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            container.innerHTML = xhr.responseText;
        }
    };

    var selectedYear = document.getElementById("transactionYear").value;
    var activeButton = document.querySelector("#monthButtons button.active");
    var selectedMonth = activeButton.getAttribute("data-month");

    xhr.open("GET", "/budget_summary_kpi_boxes?year=" + selectedYear + "&month=" + selectedMonth, true);
    xhr.send();
}

// Call the function when the page loads or as needed
window.onload = function () {
    updateBudgetKPIBoxes();
};




var SortAscDesc = false;  // Set your default value, replace false with your desired default

function updateBudgetSummaryChart() {
    var xhr = new XMLHttpRequest();

    var selectedYear = document.getElementById("transactionYear").value;
    var activeButton = document.querySelector("#monthButtons button.active");
    var selectedMonth = activeButton.getAttribute("data-month");
    var sortCriteria = document.getElementById("sortCriteria").value;


    var SortAscDesc = document.getElementById("SortAscDesc").value.toLowerCase() === "true"; // Convert to boolean

    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            // Include the rendered budget summary chart HTML here
            document.getElementById("budgetSummaryChart").innerHTML = xhr.responseText;
        }
    };

    // Use the SortAscDesc parameter in the request URL
    xhr.open("GET", "/budget_summary_chart?year=" + selectedYear + "&month=" + selectedMonth + "&sort_criteria=" + sortCriteria + "&SortAscDesc=" + SortAscDesc, true);

    xhr.send();

    updateBudgetKPIBoxes();
}



function updateTransactionTable(selectedMonth) {
    var selectedYear = document.getElementById("transactionYear").value;
    var sortCriteria = document.getElementById("sortCriteria").value;
    document.getElementById("transactionDetails").style.display = 'none';
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            document.getElementById("transactionTableBody").innerHTML = xhr.responseText;
        }
    };
    xhr.open("GET", "/update_transaction_table?year=" + selectedYear + "&month=" + selectedMonth, true);
    xhr.send();

    // Remove the 'active' class from all buttons
    var buttons = document.querySelectorAll("#monthButtons button");
    buttons.forEach(function (button) {
        button.classList.remove("active");
    });

    // Add the 'active' class to the clicked button
    var activeButton = document.querySelector("#monthButtons button[data-month='" + selectedMonth + "']");
    activeButton.classList.add("active");

    updateBudgetSummaryChart();

}


function showTransactionDetails(event, selectedSubcategory, spentAmount) {
    // Prevent the default behavior of the anchor tag
    event.preventDefault();
    previousSubcategory = selectedSubcategory;

    document.getElementById("transactionDetails").style.display = 'block';


    var selectedYear = document.getElementById("transactionYear").value;
    var activeButton = document.querySelector("#monthButtons button.active");

    // Get the selected month from the 'data-month' attribute of the active button
    var selectedMonth = activeButton.getAttribute("data-month");

    console.log("Function called:", selectedYear, selectedMonth, selectedSubcategory);

    // Set the selected subcategory as the header
    var header = document.createElement("h2");
    header.textContent = "Details of " + selectedSubcategory + " - " + spentAmount;
    document.getElementById("transactionDetails").innerHTML = "";
    document.getElementById("transactionDetails").appendChild(header);

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            document.getElementById("transactionDetails").innerHTML += xhr.responseText;

            // Scroll to the Transaction Details table
            document.getElementById("transactionDetails").scrollIntoView({ behavior: "smooth" });
        }
    };
    xhr.open("GET", "/get_transaction_details?year=" + selectedYear + "&month=" + selectedMonth + "&subcategory=" + selectedSubcategory, true);
    xhr.send();
}




window.onload = function () {
    // Get the current date to set the default month
    var currentDate = new Date();
    var currentYear = currentDate.getFullYear();
    var currentMonth = currentDate.getMonth() + 1; // Month is zero-based, so add 1

    // Format the current month as 'MM'
    var formattedCurrentMonth = currentMonth < 10 ? '0' + currentMonth : currentMonth;

    // Set the default month value
    var defaultMonth = currentYear + '-' + formattedCurrentMonth;

    // Trigger the updateTransactionTable function with the default month
    updateTransactionTable(formattedCurrentMonth);

    // Add the 'active' class to the default month button
    var defaultButton = document.querySelector("#monthButtons button[data-month='" + formattedCurrentMonth + "']");
    defaultButton.classList.add("active");
};



$(document).ready(function () {
    $('#downloadButton').on('click', function () {
        // Show the spinner
        $('#spinner').show();

        $.ajax({
            url: '/download_data',
            type: 'POST',
            success: function (response) {
                // Hide the spinner on success
                $('#spinner').hide();

                if (response.success) {
                    alert(response.message);
                    // Reload the page after successful download
                    location.reload();
                } else {
                    alert('Error: ' + response.message);
                }
            },
            error: function (error) {
                // Hide the spinner on error
                $('#spinner').hide();

                alert('Error: ' + error.statusText);
            }
        });
    });


});



function editBudget(event, subcategory, currentBudget) {
    console.log("Editing budget...", subcategory);

    const budgetValueElement = event.target;

    // Create a container div
    const container = document.createElement('div');

    // Create an input element
    const inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.value = currentBudget;

    // Create a span element
    const spanElement = document.createElement('span');
    spanElement.textContent = currentBudget;

    // Append the input and span elements to the container
    container.appendChild(inputElement);
    container.appendChild(spanElement);

    // Replace the entire container with the original budgetValueElement
    budgetValueElement.parentNode.replaceChild(container, budgetValueElement);

    // Focus on the input element
    inputElement.focus();

    // Add event listeners to handle blur and focusout events
    inputElement.addEventListener('blur', handleUpdate);
    inputElement.addEventListener('focusout', handleUpdate);

    function handleUpdate() {
        // Use function scope to access variables
        updateBudget(subcategory, inputElement.value);

        // Replace the container with the original budgetValueElement
        if (budgetValueElement.parentNode) {
            budgetValueElement.parentNode.replaceChild(budgetValueElement, container);
        }
    }

    // Add event listener to handle keypress (Enter) events
    inputElement.addEventListener('keypress', function (e) {
        // Use function scope to access variables
        if (e.key === 'Enter') {
            handleUpdate();
        }
    });
}






function updateBudget(subcategory, newBudget) {

    console.log("Editing budget: subcategory is ", subcategory, " newBudget is ", newBudget);

    var selectedYear = document.getElementById("transactionYear").value;
    var activeButton = document.querySelector("#monthButtons button.active");

    // Get the selected month from the 'data-month' attribute of the active button
    var selectedMonth = activeButton.getAttribute("data-month");

    $.ajax({
        url: '/inline_edit_budget',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            year: selectedYear,
            month: selectedMonth,
            subcategory: subcategory,
            budget: newBudget
        }),
        success: function (data, textStatus, jqXHR) {
            console.log('Budget updated successfully:', data);
            // Update any UI elements as needed
            updateBudgetSummaryChart();

        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error('Error updating budget:', textStatus);
        }
    });
}


let showBudgetForm = false;
function toggleAddBudgetForm() {
    const addBudgetForm = document.getElementById('addBudgetForm');

    // Assuming you have selectedYear and selectedMonth variables
    var selectedYear = document.getElementById("transactionYear").value;
    var activeButton = document.querySelector("#monthButtons button.active");
    var selectedMonth = activeButton.getAttribute("data-month");
    // Set the default value for the budgetMonth input
    document.getElementById("budgetMonth").value = selectedYear + '-' + selectedMonth;

    showBudgetForm = !showBudgetForm;
    if (showBudgetForm) {
        addBudgetForm.classList.remove('hide');
    } else {
        addBudgetForm.classList.add('hide');
    }

}

function addBudget() {
    const budgetMonthInput = document.getElementById('budgetMonth');
    const budgetMonth = budgetMonthInput.value.trim();
    console.log("Inside add budget")

    // Validate the date format using a regular expression
    const dateFormatRegex = /^\d{4}-\d{2}$/;

    if (!dateFormatRegex.test(budgetMonth)) {
        // Display an error message and apply the red border style
        budgetMonthInput.setCustomValidity('Invalid date format. Please use YYYY-MM.');
        budgetMonthInput.classList.add('invalid-date');
        return;
    } else {
        // If the date is valid, remove the error message and style
        budgetMonthInput.setCustomValidity('');
        budgetMonthInput.classList.remove('invalid-date');
    }

    // Continue with the rest of your logic for adding the budget

    // Get other input values (subcategory, budget amount, etc.)
    //const subCategory = document.getElementById('subCategoryInput').value.trim();
    const subCategory = $('#subCategoryInput').val();
    const budgetAmount = document.getElementById('budgetAmountInput').value.trim();

    // You can perform additional validation for subcategory and budget amount if needed

    // Prepare the data to be sent to the server
    const requestData = {
        budgetMonth: budgetMonth,
        subCategory: subCategory,
        budgetAmount: budgetAmount
    };

    // Perform an AJAX request to send the data to the server
    $.ajax({
        url: '/add_budget',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(requestData),
        success: function (data, textStatus, jqXHR) {
            console.log('Budget added successfully:', data);
            // Perform any UI updates or redirection as needed

            // Optionally, hide the form after successful submission
            toggleAddBudgetForm();

            updateBudgetSummaryChart();
            // Clear input fields
            budgetMonthInput.value = '';
            subCategoryInput.value = '';
            budgetAmountInput.value = '';
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error('Error adding budget:', textStatus, errorThrown);

            if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                alert('Error: ' + jqXHR.responseJSON.error);
            } else {
                alert('An unknown error occurred while adding the budget.');
            }
        }
    });
}






function deleteBudget(subCategory) {
    // Get the selected year and month from the button filters
    var selectedYear = document.getElementById("transactionYear").value;
    var activeButton = document.querySelector("#monthButtons button.active");
    var selectedMonth = activeButton.getAttribute("data-month");


    // Check if the user wants to delete the budget
    if (confirm("Are you sure you want to delete the budget for " + subCategory + " in " + selectedYear + "-" + selectedMonth + "?")) {
        // Prepare data for the AJAX request
        var requestData = {
            subCategory: subCategory,
            year: selectedYear,
            month: selectedMonth
        };

        // Make the AJAX request

        $.ajax({
            type: 'POST',
            url: '/delete_budget',
            contentType: 'application/json',  // Set content type to JSON
            data: JSON.stringify(requestData),  // Convert data to JSON
            success: function (response) {
                // Handle success response
                console.log(response);
                // You may want to update the UI or take further actions
                console.log("Inside Delete budget")
                updateBudgetSummaryChart();
            },
            error: function (error) {
                // Handle error
                console.error(error);
            }
        });
    }
}








// Function to populate the subcategory dropdown and show it
function showSubcategoryDropdown(button) {
    // Hide the "Re-categorize" button
    $(button).hide();

    // Show the label and dropdown
    var row = $(button).closest('tr');
    var dropdownLabel = row.find('.subcategoryLabel');
    var subcategoryDropdown = row.find('#subcategorySelect');
    var updateButton = row.find('.updateSubcategoryButton');

    dropdownLabel.show();

    // Show the regular dropdown
    subcategoryDropdown.show();

    // Fetch subcategories using an AJAX request
    $.get('/getDistinctSubcategories', function (subcategories) {
        // Clear existing options
        subcategoryDropdown.empty();

        // Populate the Select2 dropdown with fetched subcategories
        subcategoryDropdown.select2({
            data: subcategories,
            placeholder: 'Select or type to search',
            allowClear: true,
        });
    });

    // Show the "Update Subcategory" button
    updateButton.show();
}



// Attach the showSubcategoryDropdown function to the "Re-categorize" button
$('.reCategorizeButton').on('click', function () {
    showSubcategoryDropdown(this);
});


var previousSubcategory = '';

// Function to update the subcategory in the database
function updateSubcategory(transactionKey, event) {
    // Get the selected subcategory from the dropdown
    // var updatedSubcategory = $('#subcategorySelect').val(); // Use ID selector
    var updatedSubcategory = $('#subcategorySelect').select2('data')[0].text;


    console.log("Inside updateSubcategory: transactionKey ", transactionKey, "updatedSubcategory :", updatedSubcategory)

    // Check if a subcategory is selected
    if (updatedSubcategory) {
        $.ajax({
            type: 'POST',
            url: '/updateSubcategory',
            data: {
                transactionId: transactionKey,
                updatedSubcategory: updatedSubcategory
            },
            success: function (response) {
                // Handle success response
                console.log('Subcategory updated successfully:', response);

                updateBudgetSummaryChart();
                showTransactionDetails(event, previousSubcategory);
                // You may want to update the UI or take further actions
            },
            error: function (error) {
                // Handle error
                console.error('Error updating subcategory:', error);
            }
        });
    } else {
        alert('Please select a subcategory before updating.');
    }
}
// start modernizing this, baby steps with iife
(function () {
    const hasTouchScreen = navigator && navigator.maxTouchPoints > 2;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isFirefox = /firefox/i.test(navigator.userAgent);

    const addBudgetForm = document.getElementById('addBudgetForm');
    const monthSelectContainer = addBudgetForm.querySelector('.month-year-picker-container');
    const picker = addBudgetForm.querySelector('.year-month-picker');
    const monthInputField = document.getElementById('budgetMonth');
    const yearContainer = addBudgetForm.querySelector('.selected-year');
    const prevYear = addBudgetForm.querySelector('.previous-year');
    const nextYear = addBudgetForm.querySelector('.next-year');
    const currentDate = new Date();
    let year = currentDate.getFullYear();
    // only desktop safari and desktop firefox don't support month picker
    // debating adding to desktop chrome bc desktop chrome's selector kinda sucks
    if(((isSafari && !hasTouchScreen) || (isFirefox && !hasTouchScreen)) && addBudgetForm && monthInputField && monthSelectContainer && picker && yearContainer && prevYear && nextYear) {
        function closePicker(e) {
            e.stopPropagation();
            if(!monthSelectContainer.contains(e.target)) {
                picker.classList.add('hide');
                document.removeEventListener('click', closePicker);
                document.addEventListener('focusin', closePicker);
            }
        }
        monthSelectContainer.addEventListener('focusin', () => {
            picker.classList.remove('hide');
            document.addEventListener('click', closePicker);
            document.addEventListener('focusin', closePicker);
        });
        prevYear.addEventListener('click', (e) => {
            e.preventDefault();
            year -= 1;
            yearContainer.innerText = year;
        });
        nextYear.addEventListener('click', (e) => {
            e.preventDefault();
            year += 1;
            yearContainer.innerText = year;
        });
        picker.querySelectorAll('.month-picker button').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                monthInputField.value = `${year}-${e.currentTarget.dataset.month}`;
                picker.classList.add('hide');
            });
        });
    }
})();