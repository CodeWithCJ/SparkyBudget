$(document).ready(function () {
    // Fetch subcategories using an AJAX request

    $.get('/getDistinctSubcategories', function (subcategories) {
        // Clear existing options

        $('#subCategoryInput').empty();

        // Populate the Select2 dropdown with fetched subcategories
        $('#subCategoryInput').select2({
            data: subcategories,
            width: '180px',
            placeholder: 'Select or type to search',
            allowClear: true,
        });
    });
});





function balanceDetailsTableToggleVisibility() {
    var balanceDetailsTable = document.getElementById('balanceDetailsTable');
    var isHidden = balanceDetailsTable.classList.contains('hidden-balance-details');

    if (isHidden) {
        balanceDetailsTable.classList.remove('hidden-balance-details');
    } else {
        balanceDetailsTable.classList.add('hidden-balance-details');
    }
}







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

    
}



function updateTransactionTable(selectedMonth) {
    var selectedYear = document.getElementById("transactionYear").value;
    var sortCriteria = document.getElementById("sortCriteria").value;
    document.getElementById("transactionDetails").style.display = 'none';
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            const transactionTableBody = document.getElementById("transactionTableBody");
            if(transactionTableBody) {
                transactionTableBody.innerHTML = xhr.responseText;
            }
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
    setTimeout(() => {
        updatePieCharts(true); // Force refresh both charts
    }, 500);

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
    xhr.open("GET", "/get_budget_transaction_details?year=" + selectedYear + "&month=" + selectedMonth + "&subcategory=" + selectedSubcategory, true);
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
    const USDollar = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    });
    console.log("Editing budget...", subcategory);

    const budgetValueElement = event.target;

    // Create a container div
    const container = document.createElement('div');

    // Create an input element
    const inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.pattern = "^(\d)+(\.\d{1,2})?$";
    inputElement.inputmode = "decimal";
    inputElement.value = currentBudget;

    // Create a span element
    const spanElement = document.createElement('span');
    spanElement.textContent = USDollar.format(currentBudget);

    // Append the input and span elements to the container
    container.appendChild(inputElement);
    container.appendChild(spanElement);

    // Replace the entire container with the original budgetValueElement
    budgetValueElement.parentNode.replaceChild(container, budgetValueElement);

    // Focus on the input element
    inputElement.focus();

    // Add event listeners to handle blur and focusout events
    inputElement.addEventListener('blur', handleUpdate);
    //inputElement.addEventListener('focusout', (e) => handleUpdate(e));

    function handleUpdate() {
        const budgetAmount = Number(inputElement.value);

        if (Number.isNaN(budgetAmount) || budgetAmount === 0) {
            // too lazy to do a modal
            const resp = confirm('Invalid budget amount. Would you like to go back and fix or cancel?');
            if(resp) {
                setTimeout(() => {
                    inputElement.focus();
                }, 0);
                return false;
            } else {
                updateBudgetSummaryChart();
                setTimeout(() => {
                    updatePieCharts(true); // Force refresh both charts
                }, 500);
                return false;
            }
        } else {
            // Use function scope to access variables
            updateBudget(subcategory, inputElement.value);
        }

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
            updateBudgetSummaryChart();
            setTimeout(() => {
                updatePieCharts(true); // Force refresh both charts
            }, 500);
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
    const addBudgetForm = document.getElementById('addBudgetForm');
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
    const subCategorySelect = document.getElementById('subCategoryInput');
    const subCategory = $('#subCategoryInput').val();

    if(!subCategory) {
        subCategorySelect.setCustomValidity('Please select a budget category');
        addBudgetForm.reportValidity();
        return false;
    }


    const budgetAmountInput = document.getElementById('budgetAmountInput');
    const budgetAmount = Number(budgetAmountInput.value.trim());

    if (Number.isNaN(budgetAmount) || budgetAmount === 0) {
        budgetAmountInput.setCustomValidity('Please enter a budget amount');
        addBudgetForm.reportValidity();
        return false;
    }

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
            setTimeout(() => {
                updatePieCharts(true); // Force refresh both charts
            }, 500);
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
                setTimeout(() => {
                    updatePieCharts(true); // Force refresh both charts
                }, 500);
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
            width: '180px',
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
                setTimeout(() => {
                    updatePieCharts(true); // Force refresh both charts
                }, 500);
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




function dailybalanceDetailsToggleVisibility() {
    var dailyBalanceContainer = document.getElementById('dailyBalanceContainer');
    
    // Toggle visibility
    dailyBalanceContainer.style.display = (dailyBalanceContainer.style.display === 'none' || dailyBalanceContainer.style.display === '') 
        ? 'block' 
        : 'none';
}

// Ensure it's hidden on the first load
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById('dailyBalanceContainer').style.display = 'none';
});


$(document).ready(function() {
    // Get daily_balance_data from the HTML data attribute
    var daily_balance_data = JSON.parse($('#dailyBalanceData').attr('data-json'));
    console.log("Loaded Daily Balance Data:", daily_balance_data);

    // Store selected Account Types and Account Names
    var selectedAccountTypes = [];
    var selectedAccountNames = [];

    // Initialize select2 for Account Name filter (Dropdown with Multi-Select)
    $('#dailyBalance_accountNameFilter').select2({
        placeholder: "Select Account Names",
        allowClear: true
    });

    // Account Type button click handler
    $('.dailyBalance_account-type-btn').on('click', function() {
        var accountType = $(this).data('account-type');
        
        // Toggle selection of the clicked Account Type
        if (selectedAccountTypes.includes(accountType)) {
            selectedAccountTypes = selectedAccountTypes.filter(item => item !== accountType);
            $(this).removeClass('selected-btn').addClass('default-btn');
        } else {
            selectedAccountTypes.push(accountType);
            $(this).removeClass('default-btn').addClass('selected-btn');
        }

        console.log("Selected Account Types:", selectedAccountTypes);
        updateAccountNameFilter(selectedAccountTypes);
        updateChart();
    });

    // Account Name dropdown selection handler
    $('#dailyBalance_accountNameFilter').on('change', function() {
        selectedAccountNames = $(this).val() || [];
        console.log("Selected Account Names:", selectedAccountNames);
        updateChart();
    });

    function updateAccountNameFilter(accountTypes) {
        var accountNames = [];
        daily_balance_data.forEach(data => {
            if (accountTypes.includes(data[0]) && !accountNames.includes(data[1])) {
                accountNames.push(data[1]);
            }
        });

        $('#dailyBalance_accountNameFilter').empty();
        accountNames.forEach(accountName => {
            $('#dailyBalance_accountNameFilter').append(new Option(accountName, accountName));
        });

        $('#dailyBalance_accountNameFilter').trigger('change');
    }

    // Initialize Chart.js
    var ctx = document.getElementById('dailyBalance_lineChart').getContext('2d');
    var dailyBalanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], // Will be updated by updateChart()
            // Inside your Chart.js configuration (no changes needed)
            datasets: [{
                label: 'Daily Balance',
                data: [],
                borderColor: function(context) {
                    const chart = context.chart;
                    const {ctx, chartArea} = chart;
                    if (!chartArea) return;
                    const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 100);
                    gradient.addColorStop(0, '#ffc800');
                    gradient.addColorStop(0.4, '#ff694a');
                    gradient.addColorStop(1, '#ff495c');
                    return gradient;
                },
                borderWidth: 6,
                pointRadius: 0,
                fill: false,
                tension: 0.4
            }]
        },
        options: {
            layout: {
                padding: {
                    right: 50 // Keep your padding
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Hide legend to match target design
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#77ace0',
                    borderWidth: 1
                },
                datalabels: {
                    align: 'end', // Position label at the end of the line
                    anchor: 'end', // Keep it inside the chart area
                    color: 'white',
                    formatter: function(value, context) {
                        var index = context.dataIndex;
                        var totalPoints = context.chart.data.labels.length;
                        var isMobile = window.innerWidth <= 768;

                        if (isMobile) {
                            if (index === 0 || index === totalPoints - 1 || index === Math.floor(totalPoints / 2)) {
                                return '$' + value.toLocaleString();
                            }
                        } else {
                            var step = Math.max(1, Math.floor(totalPoints / 8));
                            if (index === 0 || index === totalPoints - 1 || index % step === 0) {
                                return '$' + value.toLocaleString();
                            }
                        }
                        return ''; // Hide other labels
                    },
                    clip: false // Prevent cutting off outside chart boundaries
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'xy',
                    },
                    zoom: {
                        enabled: true,
                        mode: 'xy',
                        speed: 0.1,
                        sensitivity: 3,
                        limits: {
                            x: { min: 0, max: 100 },
                            y: { min: 0, max: 2000 }
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: false // Hide x-axis grid lines to match target design
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.6)', // Softer color
                        maxTicksLimit: 6, // Limit the number of labels to avoid clutter
                        callback: function(value, index, values) {
                            const date = dailyBalanceChart.data.labels[index];
                            if (date) {
                                return date.split('-').slice(1).join('-'); // Format as "MM-DD"
                            }
                            return '';
                        }
                    }
                },
                y: {
                    display: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)', // Subtle grid lines
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.6)', // Softer color
                        callback: function(value) {
                            return '$' + value.toLocaleString(); // Format with $ and comma separator
                        }
                    }
                }
            }
        },
        plugins: [ChartDataLabels] // Enable Data Labels Plugin
    });

    function aggregateData(selectedAccountTypes, selectedAccountNames) {
        var aggregatedData = {};

        if (selectedAccountTypes.length === 0) {
            selectedAccountTypes = [...new Set(daily_balance_data.map(data => data[0]))];
        }

        var filteredData = daily_balance_data.filter(data =>
            (selectedAccountTypes.length === 0 || selectedAccountTypes.includes(data[0])) &&
            (selectedAccountNames.length === 0 || selectedAccountNames.includes(data[1]))
        );

        filteredData.forEach(data => {
            var date = new Date(data[2]).toISOString().split('T')[0];
            var balance = data[3];

            if (!aggregatedData[date]) {
                aggregatedData[date] = 0;
            }
            aggregatedData[date] += balance;
        });

        return {
            labels: Object.keys(aggregatedData),
            data: Object.values(aggregatedData)
        };
    }

    function updateChart() {
        var aggregatedData = aggregateData(selectedAccountTypes, selectedAccountNames);

        if (dailyBalanceChart && dailyBalanceChart.data) {
            dailyBalanceChart.data.labels = aggregatedData.labels;
            dailyBalanceChart.data.datasets[0].data = aggregatedData.data;

            // Update the header with the latest balance
            const latestBalance = aggregatedData.data[aggregatedData.data.length - 1] || 0;
            document.querySelector('.chart-card .views .number').textContent = `$${latestBalance.toLocaleString()}`;

            dailyBalanceChart.update();
        }
    }

    updateChart();
});










// Register Chart.js plugins
Chart.register(ChartDataLabels);

// Global variables for Chart.js instances
let incomePieChart = null;
let incomeVsBudgetPieChart = null;

function updatePieCharts(forceRefresh = false) {
    console.log('Updating both pie charts...');

    var selectedYear = document.getElementById("transactionYear").value;
    var activeButton = document.querySelector("#monthButtons button.active");
    var selectedMonth = activeButton ? activeButton.getAttribute("data-month") : '01';

    if (!selectedYear || !selectedMonth) {
        console.error('Missing year or month selection');
        return;
    }

    $.ajax({
        url: '/budget_summary_pie_chart',
        type: 'GET',
        data: {
            year: selectedYear,
            month: selectedMonth
        },
        success: function (data) {
            // Extract data from JSON response
            const income = data.income || 0;
            const budget = data.budget || 0;
            const spent = Math.abs(data.spent) || 0;

            // Format currency for display
            const USDollar = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            });
            document.getElementById('incomeTotal').textContent = `Income - ${USDollar.format(income)}`;
            document.getElementById('budgetTotal').textContent = `Budget - ${USDollar.format(budget)}`;

            // Update first pie chart (Budget vs. Spent vs. Remaining)
            const remainingBudget = budget - spent;
            console.log('Budget:', budget, 'Spent:', spent, 'Remaining:', remainingBudget);

            const spentProportion = budget > 0 ? spent / budget : 0;
            const spentAngle = spentProportion * 360;
            const rotationBudget = 360 - spentAngle;

            const ctxBudget = document.getElementById('incomePieChart');
            if (!ctxBudget) {
                console.error('Canvas element with ID "incomePieChart" not found.');
                return;
            }
            const chartContextBudget = ctxBudget.getContext('2d');

            const gradientSpent = chartContextBudget.createLinearGradient(0, 0, 0, 400);
            gradientSpent.addColorStop(0, 'rgba(255, 111, 97, 0.9)');
            gradientSpent.addColorStop(1, 'rgba(255, 111, 97, 0.5)');

            const gradientRemainingBudget = chartContextBudget.createLinearGradient(0, 0, 0, 400);
            gradientRemainingBudget.addColorStop(0, 'rgba(77, 182, 172, 0.9)');
            gradientRemainingBudget.addColorStop(1, 'rgba(77, 182, 172, 0.5)');

            const budgetPieChartData = {
                labels: ['Budgeted', 'Spent', 'Remaining'],
                datasets: [{
                    data: [0, spent, remainingBudget],
                    backgroundColor: ['rgba(0, 0, 0, 0)', gradientSpent, gradientRemainingBudget],
                    borderWidth: 0
                }]
            };

            if (incomePieChart && !forceRefresh) {
                incomePieChart.data = budgetPieChartData;
                incomePieChart.options.rotation = rotationBudget;
                incomePieChart.update();
            } else {
                if (incomePieChart) {
                    incomePieChart.destroy();
                }
                incomePieChart = new Chart(chartContextBudget, {
                    type: 'pie',
                    data: budgetPieChartData,
                    options: {
                        responsive: true,
                        rotation: rotationBudget,
                        circumference: 360,
                        direction: 'clockwise',
                        plugins: {
                            legend: {
                                position: 'top',
                                labels: {
                                    color: '#d6dadf',
                                    boxWidth: 20,
                                    padding: 10,
                                    font: { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" },
                                    filter: (legendItem) => legendItem.text !== 'Budgeted'
                                }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(26, 37, 38, 0.9)',
                                titleColor: '#d6dadf',
                                bodyColor: '#d6dadf',
                                callbacks: { label: (context) => `${context.label}: $${context.raw.toLocaleString()}` }
                            },
                            datalabels: {
                                color: '#fff',
                                formatter: (value, context) => context.dataIndex === 0 ? '' : `$${value.toLocaleString()}`,
                                font: { weight: 'normal', family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" },
                                anchor: 'center',
                                align: 'center',
                                textAlign: 'center'
                            }
                        },
                        elements: { arc: { shadowColor: 'rgba(0, 0, 0, 0.3)', shadowBlur: 10, shadowOffsetX: 2, shadowOffsetY: 2 } }
                    }
                });
            }

            // Update second pie chart (Income vs. Budget vs. Remaining)
            const remainingIncome = income - budget;
            console.log('Income:', income, 'Budget:', budget, 'Remaining:', remainingIncome);

            const budgetProportion = income > 0 ? budget / income : 0;
            const budgetAngle = budgetProportion * 360;
            const rotationIncome = 360 - budgetAngle;

            const ctxIncome = document.getElementById('incomeVsBudgetPieChart');
            if (!ctxIncome) {
                console.error('Canvas element with ID "incomeVsBudgetPieChart" not found.');
                return;
            }
            const chartContextIncome = ctxIncome.getContext('2d');

            const gradientBudget = chartContextIncome.createLinearGradient(0, 0, 0, 400);
            gradientBudget.addColorStop(0, 'rgba(255, 111, 97, 0.9)');
            gradientBudget.addColorStop(1, 'rgba(255, 111, 97, 0.5)');

            const gradientRemainingIncome = chartContextIncome.createLinearGradient(0, 0, 0, 400);
            gradientRemainingIncome.addColorStop(0, 'rgba(77, 182, 172, 0.9)');
            gradientRemainingIncome.addColorStop(1, 'rgba(77, 182, 172, 0.5)');

            const incomePieChartData = {
                labels: ['Income', 'Budget', 'Remaining'],
                datasets: [{
                    data: [0, budget, remainingIncome],
                    backgroundColor: ['rgba(0, 0, 0, 0)', gradientBudget, gradientRemainingIncome],  
                    borderWidth: 0
                }]
            };

            if (incomeVsBudgetPieChart && !forceRefresh) {
                incomeVsBudgetPieChart.data = incomePieChartData;
                incomeVsBudgetPieChart.options.rotation = rotationIncome;
                incomeVsBudgetPieChart.update();
            } else {
                if (incomeVsBudgetPieChart) {
                    incomeVsBudgetPieChart.destroy();
                }
                incomeVsBudgetPieChart = new Chart(chartContextIncome, {
                    type: 'pie',
                    data: incomePieChartData,
                    options: {
                        responsive: true,
                        rotation: rotationIncome,
                        circumference: 360,
                        direction: 'clockwise',
                        plugins: {
                            legend: {
                                position: 'top',
                                labels: {
                                    color: '#d6dadf',
                                    boxWidth: 20,
                                    padding: 10,
                                    font: { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" },
                                    filter: (legendItem) => legendItem.text !== 'Income'
                                }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(26, 37, 38, 0.9)',
                                titleColor: '#d6dadf',
                                bodyColor: '#d6dadf',
                                callbacks: { label: (context) => `${context.label}: $${context.raw.toLocaleString()}` }
                            },
                            datalabels: {
                                color: '#fff',
                                formatter: (value, context) => context.dataIndex === 0 ? '' : `$${value.toLocaleString()}`,
                                font: { weight: 'normal', family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" },
                                anchor: 'center',
                                align: 'center',
                                textAlign: 'center'
                            }
                        },
                        elements: { arc: { shadowColor: 'rgba(0, 0, 0, 0.3)', shadowBlur: 10, shadowOffsetX: 2, shadowOffsetY: 2 } }
                    }
                });
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error('Error fetching data for pie charts:', textStatus, errorThrown);
            document.getElementById('incomeTotal').textContent = 'Income - Error';
            document.getElementById('budgetTotal').textContent = 'Budget - Error';
        }
    });
}

// Replace individual chart functions with the combined one
function updateIncomePieChart(forceRefresh = false) {
    updatePieCharts(forceRefresh);
}

function updateIncomeVsBudgetPieChart(forceRefresh = false) {
    updatePieCharts(forceRefresh);
}

// Initial render and event listeners
document.addEventListener('DOMContentLoaded', function () {
    debouncedUpdatePieCharts();
    const transactionYear = document.getElementById('transactionYear');
    const monthButtons = document.querySelectorAll('#monthButtons button');

    if (transactionYear) {
        transactionYear.addEventListener('change', () => debouncedUpdatePieCharts());
    }

    monthButtons.forEach(button => {
        button.addEventListener('click', () => debouncedUpdatePieCharts());
    });
});

