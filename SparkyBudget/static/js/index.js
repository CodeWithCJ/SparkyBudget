$(document).ready(function () {
    // Explicitly hide the balance summary container on mobile initially
    $('.balance-summary-container').addClass('hide');

    // Fetch subcategories using an AJAX request
    $.get('/getDistinctSubcategories', function (subcategories) {
        $('#subCategoryInput').empty();
        $('#subCategoryInput').select2({
            data: subcategories,
            width: '180px',
            placeholder: 'Select or type to search',
            allowClear: true,
        });
    });

    // Initialize the custom month-year picker for the .filters section
    const filtersPickerContainer = document.querySelector('.filters .month-year-picker-container');
    const filtersPicker = document.querySelector('.filters .year-month-picker');
    const calendarPickerInput = document.getElementById('calendarPicker');
    const yearContainer = document.querySelector('.filters .selected-year');
    const prevYear = document.querySelector('.filters .previous-year');
    const nextYear = document.querySelector('.filters .next-year');
    const clearButton = document.querySelector('.filters .clear-button');
    const thisMonthButton = document.querySelector('.filters .this-month-button');

    let year = new Date().getFullYear(); // Default to current year (2025)
    yearContainer.textContent = year;

    const monthNames = {
        '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
        '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
    };

   function closePicker(e) {
        e.stopPropagation();
        if (!filtersPickerContainer.contains(e.target)) {
            filtersPicker.classList.add('hide');
            document.removeEventListener('click', closePicker);
            document.addEventListener('focusin', closePicker);
        }
    }

    // Show the picker on focus/click
    filtersPickerContainer.addEventListener('click', () => {
        filtersPicker.classList.remove('hide');
        document.addEventListener('click', closePicker);
        document.addEventListener('focusin', closePicker);
    });

    // Previous year button
    prevYear.addEventListener('click', (e) => {
        e.preventDefault();
        year -= 1;
        yearContainer.textContent = year;
    });

    // Next year button
    nextYear.addEventListener('click', (e) => {
        e.preventDefault();
        year += 1;
        yearContainer.textContent = year;
    });

    // Month buttons
    filtersPicker.querySelectorAll('.month-picker button').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const transactionMonth = e.currentTarget.dataset.month;
            const transactionYear = year;
            calendarPickerInput.value = `${transactionYear}-${transactionMonth}`;
            calendarPickerDisplay.textContent = `${transactionYear}-${monthNames[transactionMonth]}`;
            filtersPicker.classList.add('hide');

            // Highlight the selected month
            filtersPicker.querySelectorAll('.month-picker button').forEach((button) => {
                button.classList.remove('selected');
            });
            btn.classList.add('selected');

            // Trigger update with the selected year and month
            updateTransactionTable(transactionMonth, transactionYear);
        });
    });

    // "This month" button
    thisMonthButton.addEventListener('click', (e) => {
        e.preventDefault();
        const now = new Date();
        year = now.getFullYear();
        const transactionMonth = String(now.getMonth() + 1).padStart(2, '0'); // Current month (e.g., "03" for March)
        const transactionYear = year;
        yearContainer.textContent = year;
        calendarPickerInput.value = `${transactionYear}-${transactionMonth}`;
        calendarPickerDisplay.textContent = `${transactionYear}-${monthNames[transactionMonth]}`;
        filtersPicker.classList.add('hide');

        // Highlight the current month
        filtersPicker.querySelectorAll('.month-picker button').forEach((button) => {
            button.classList.remove('selected');
            if (button.dataset.month === transactionMonth) {
                button.classList.add('selected');
            }
        });

        // Trigger update
        updateTransactionTable(transactionMonth, transactionYear);
    });

    // "Clear" button
    clearButton.addEventListener('click', (e) => {
        e.preventDefault();
        calendarPickerInput.value = '';
        calendarPickerDisplay.textContent = '';
       filtersPicker.classList.add('hide');

        // Remove highlighting from all month buttons
        filtersPicker.querySelectorAll('.month-picker button').forEach((button) => {
            button.classList.remove('selected');
        });

        // Optionally, reset your app to a default state
        // For now, let's not trigger an update since the input is cleared
    });

    // Highlight the default month (current month) on load
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0'); // e.g., "03" for March
    filtersPicker.querySelectorAll('.month-picker button').forEach((button) => {
        if (button.dataset.month === currentMonth) {
            button.classList.add('selected');
        }
    });

    
});

    // Toggle visibility of balance summary on piggy bank icon click
    $('#toggleBalanceSummary').on('click', function() {
        $('.balance-summary-container').toggleClass('hide');
    });

function balanceDetailsTableToggleVisibility() {
    document.querySelector('.main-content').scrollTo(0, 0);
    var balanceDetailsTable = document.getElementById('balanceDetailsTable');
    var isHidden = balanceDetailsTable.classList.contains('hidden-balance-details');

    if (isHidden) {
        balanceDetailsTable.classList.remove('hidden-balance-details');
    } else {
        balanceDetailsTable.classList.add('hidden-balance-details');
    }
}

var SortAscDesc = false; // Set your default value


function updateBudgetSummaryChartFromDropdown() {
    var calendarValue = document.getElementById("calendarPicker").value;
    if (!calendarValue) {
        console.error("Calendar picker value is empty. Cannot update budget summary chart.");
        return;
    }
    var [transactionYear, transactionMonth] = calendarValue.split("-");
    updateBudgetSummaryChart(transactionYear, transactionMonth);
}

function updateBudgetSummaryChart(transactionYear, transactionMonth) {
    
    console.log("Updating budget summary chart for year:", transactionYear, "and month:", transactionMonth);
    var xhr = new XMLHttpRequest();    
    var sortCriteria = document.getElementById("sortCriteria").value;
    var SortAscDesc = document.getElementById("SortAscDesc").value.toLowerCase() === "true"; // Convert to boolean

    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            // Include the rendered budget summary chart HTML here
            document.getElementById("budgetSummaryChart").innerHTML = xhr.responseText;
        }
    };

    // Use the SortAscDesc parameter in the request URL
    xhr.open("GET", "/budget_summary_chart?year=" + transactionYear + "&month=" + transactionMonth + "&sort_criteria=" + sortCriteria + "&SortAscDesc=" + SortAscDesc, true);

    xhr.send();

    
}




function updateTransactionTable(transactionMonth, transactionYear) {
    var sortCriteria = document.getElementById("sortCriteria").value;
    document.getElementById("transactionDetails").style.display = 'none';
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            const transactionTableBody = document.getElementById("transactionTableBody");
            if (transactionTableBody) {
                transactionTableBody.innerHTML = xhr.responseText;
            }
        }
    };
    //xhr.open("GET", "/update_transaction_table?year=" + transactionYear + "&month=" + transactionMonth, true);
    //xhr.send();

    updateBudgetSummaryChart(transactionYear, transactionMonth);
    setTimeout(() => {
        updatePieCharts(true); // Force refresh both charts
    }, 500);
}

var previousSubcategory = '';
function showTransactionDetails(event, selectedSubcategory, spentAmount) {
    event.preventDefault();
    previousSubcategory = selectedSubcategory;
    document.getElementById("transactionDetails").style.display = 'block';

    var calendarValue = document.getElementById("calendarPicker").value;
    var [transactionYear, transactionMonth] = calendarValue.split("-");

    console.log("Function called:", transactionYear, transactionMonth, selectedSubcategory);

    document.getElementById("transactionDetails").innerHTML = "";

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            // Get the received HTML content
            var transactionDetailsHTML = xhr.responseText;

            // Create a temporary div to hold the received HTML and work with its DOM
            var tempDiv = document.createElement('div');
            tempDiv.innerHTML = transactionDetailsHTML;

            // Create the header element
            var header = document.createElement("h4");
            const usdFormatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
            });
            header.textContent = selectedSubcategory + " Expenses: " + usdFormatter.format(spentAmount);
            header.style.textAlign = "center";
            header.classList.add('transaction-subcategory-header'); // Add the CSS class for styling

            // Find the sb-table-container within the loaded HTML
            var tableContainer = tempDiv.querySelector('.sb-table-container.budget-transaction-container');

            // Insert the header as the first child of the table container
            if (tableContainer) {
                tableContainer.insertBefore(header, tableContainer.firstChild);
            } else {
                // Fallback: if container not found, prepend to the temp div
                tempDiv.insertBefore(header, tempDiv.firstChild);
            }

            // Set the innerHTML of the transactionDetails div to the modified content
            document.getElementById("transactionDetails").innerHTML = tempDiv.innerHTML;
            document.getElementById("transactionDetails").scrollIntoView({ behavior: "smooth" });
        }
    };
    xhr.open("GET", "/get_budget_transaction_details?year=" + transactionYear + "&month=" + transactionMonth + "&subcategory=" + selectedSubcategory, true);
    xhr.send();
}

window.onload = function () {
    var currentDate = new Date();
    var transactionYear = currentDate.getFullYear(); // e.g., 2025
    var transactionMonth = String(currentDate.getMonth() + 1).padStart(2, '0'); // e.g., "03" for March

    updateTransactionTable(transactionMonth, transactionYear);
};

function editBudget(event, subcategory, currentBudget) {
    const USDollar = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    });
    console.log("Editing budget...", subcategory);

    const budgetValueElement = event.target;
    const container = document.createElement('div');
    const inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.pattern = "^(\d)+(\.\d{1,2})?$";
    inputElement.inputmode = "decimal";
    inputElement.value = currentBudget;
    const spanElement = document.createElement('span');
    spanElement.textContent = USDollar.format(currentBudget);
    container.appendChild(inputElement);
    container.appendChild(spanElement);
    budgetValueElement.parentNode.replaceChild(container, budgetValueElement);
    inputElement.focus();

    inputElement.addEventListener('blur', handleUpdate);

    function handleUpdate() {
        const budgetAmount = Number(inputElement.value);
        if (Number.isNaN(budgetAmount) || budgetAmount === 0) {
            const resp = confirm('Invalid budget amount. Would you like to go back and fix or cancel?');
            if (resp) {
                setTimeout(() => {
                    inputElement.focus();
                }, 0);
                return false;
            } else {
                var calendarValue = document.getElementById("calendarPicker").value;
                var [transactionYear, transactionMonth] = calendarValue.split("-");
                updateBudgetSummaryChart(transactionYear, transactionMonth);
                setTimeout(() => {
                    updatePieCharts(true);
                }, 500);
                return false;
            }
        } else {
            updateBudget(subcategory, inputElement.value);
        }

        if (budgetValueElement.parentNode) {
            budgetValueElement.parentNode.replaceChild(budgetValueElement, container);
        }
    }

    inputElement.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            handleUpdate();
        }
    });
}

function updateBudget(subcategory, newBudget) {
    console.log("Editing budget: subcategory is ", subcategory, " newBudget is ", newBudget);

    var calendarValue = document.getElementById("calendarPicker").value;
    var [transactionYear, transactionMonth] = calendarValue.split("-");

    $.ajax({
        url: '/inline_edit_budget',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            year: transactionYear,
            month: transactionMonth,
            subcategory: subcategory,
            budget: newBudget
        }),
        success: function (data, textStatus, jqXHR) {
            console.log('Budget updated successfully:', data);
            updateBudgetSummaryChart(transactionYear, transactionMonth);
            setTimeout(() => {
                updatePieCharts(true);
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
    showBudgetForm = !showBudgetForm;
    if (showBudgetForm) {
        addBudgetForm.classList.remove('hide');
    } else {
        addBudgetForm.classList.add('hide');
    }
}

function addBudget() {
    const addBudgetForm = document.getElementById('addBudgetForm');
    const calendarPickerValue = document.getElementById("calendarPicker").value;
    const [transactionYear, transactionMonth] = calendarPickerValue.split("-"); // Split "YYYY-MM" into year and month

    const subCategorySelect = document.getElementById('subCategoryInput');
    const subCategory = $('#subCategoryInput').val();
    if (!subCategory) {
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

    const requestData = {
        budgetMonth: `${transactionYear}-${transactionMonth}`, // Combine year and month for consistency
        subCategory: subCategory,
        budgetAmount: budgetAmount
    };

    console.log("Adding new budget: subcategory is ", subCategory, " year:", transactionYear, " month:",transactionMonth);

    $.ajax({
        url: '/add_budget',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(requestData),
        success: function (data, textStatus, jqXHR) {
            console.log('Budget added successfully:', data);
            toggleAddBudgetForm();
            updateBudgetSummaryChart(transactionYear, transactionMonth);
            setTimeout(() => {
                updatePieCharts(true);
            }, 500);
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
    var calendarValue = document.getElementById("calendarPicker").value;
    var [transactionYear, transactionMonth] = calendarValue.split("-");

    if (confirm("Are you sure you want to delete the budget for " + subCategory + " in " + transactionYear + "-" + transactionMonth + "?")) {
        var requestData = {
            subCategory: subCategory,
            year: transactionYear,
            month: transactionMonth
        };

        $.ajax({
            type: 'POST',
            url: '/delete_budget',
            contentType: 'application/json',
            data: JSON.stringify(requestData),
            success: function (response) {
                console.log(response);
                console.log("Inside Delete budget");
                updateBudgetSummaryChart(transactionYear, transactionMonth);
                setTimeout(() => {
                    updatePieCharts(true);
                }, 500);
            },
            error: function (error) {
                console.error(error);
            }
        });
    }
}

// Modernized IIFE for the budgetMonth picker in addBudgetForm
// Modernized IIFE for the budgetMonth picker in addBudgetForm
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

    if (((isSafari && !hasTouchScreen) || (isFirefox && !hasTouchScreen)) && addBudgetForm && monthInputField && monthSelectContainer && picker && yearContainer && prevYear && nextYear) {
        function closePicker(e) {
            e.stopPropagation();
            if (!monthSelectContainer.contains(e.target)) {
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
    document.querySelector('.main-content').scrollTo(0, 0);
    var dailyBalanceContainer = document.getElementById('dailyBalanceContainer');
    dailyBalanceContainer.style.display = (dailyBalanceContainer.style.display === 'none' || dailyBalanceContainer.style.display === '') ? 'block' : 'none';
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById('dailyBalanceContainer').style.display = 'none';
});

$(document).ready(function () {
    var daily_balance_data = JSON.parse($('#dailyBalanceData').attr('data-json'));
    console.log("Loaded Daily Balance Data:", daily_balance_data);

    var selectedAccountTypes = [];
    var selectedAccountNames = [];

    $('#dailyBalance_accountNameFilter').select2({
        placeholder: "Select Account Names",
        allowClear: true
    });

    $('.dailyBalance_account-type-btn').on('click', function () {
        var accountType = $(this).data('account-type');
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

    $('#dailyBalance_accountNameFilter').on('change', function () {
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

    var ctx = document.getElementById('dailyBalance_lineChart').getContext('2d');
    var dailyBalanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Daily Balance',
                data: [],
                borderColor: function (context) {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
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
                    right: 50
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
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
                    align: 'end',
                    anchor: 'end',
                    color: 'white',
                    formatter: function (value, context) {
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
                        return '';
                    },
                    clip: false
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'xy',
                    },
                    zoom: {
                        wheel: {
                            enabled: true, // Enable zooming via mouse wheel
                        },
                        drag: {
                            enabled: true, // Enable zooming via dragging
                        },
                        pinch: {
                            enabled: true, // Enable zooming via pinch gesture (touch devices)
                        },
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
                        display: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.6)',
                        maxTicksLimit: 6,
                        callback: function (value, index, values) {
                            const date = dailyBalanceChart.data.labels[index];
                            if (date) {
                                return date.split('-').slice(1).join('-');
                            }
                            return '';
                        }
                    }
                },
                y: {
                    display: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.6)',
                        callback: function (value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
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

            const latestBalance = aggregatedData.data[aggregatedData.data.length - 1] || 0;
            document.querySelector('.chart-card .views .number').textContent = `$${latestBalance.toLocaleString()}`;

            dailyBalanceChart.update();
        }
    }

    updateChart();
});

Chart.register(ChartDataLabels);

let incomePieChart = null;
let incomeVsBudgetPieChart = null;

function updatePieCharts(forceRefresh = false) {
    console.log('Updating both pie charts...');

    var calendarValue = document.getElementById("calendarPicker").value;
    var [transactionYear, transactionMonth] = calendarValue.split("-");

    if (!transactionYear || !transactionMonth) {
        console.error('Missing year or month selection');
        return;
    }

    $.ajax({
        url: '/budget_summary_pie_chart',
        type: 'GET',
        data: {
            year: transactionYear,
            month: transactionMonth
        },
        success: function (data) {
            const income = data.income || 0;
            const budget = data.budget || 0;
            const spent = Math.abs(data.spent) || 0;

            const USDollar = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            });
            document.getElementById('incomeTotal').textContent = `Income - ${USDollar.format(income)}`;
            document.getElementById('budgetTotal').textContent = `Budget - ${USDollar.format(budget)}`;

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

function updateIncomePieChart(forceRefresh = false) {
    updatePieCharts(forceRefresh);
}

function updateIncomeVsBudgetPieChart(forceRefresh = false) {
    updatePieCharts(forceRefresh);
}


$(document).ready(function () {
    $('.reCategorizeButton').on('click', function () {
        showSubcategoryDropdown(this);
    });

    $('.budget_transaction_details_reCategorizeButton').on('click', function () {
        budget_transaction_details_showSubcategoryDropdown(this);
    });

    $('.budget_transaction_details_status').on('click', function () {
        budget_transaction_details_toggleDetails(this);
    });
});

function showSubcategoryDropdown(button) {
    $(button).hide();
    var row = $(button).closest('tr');
    var dropdownLabel = row.find('.subcategoryLabel');
    var subcategoryDropdown = row.find('#subcategorySelect');
    var updateButton = row.find('.updateSubcategoryButton');

    dropdownLabel.show();
    subcategoryDropdown.show();

    $.get('/getDistinctSubcategories', function (subcategories) {
        subcategoryDropdown.empty();
        subcategoryDropdown.select2({
            data: subcategories,
            width: '180px',
            placeholder: 'Select or type to search',
            allowClear: true,
        });
    });

    updateButton.show();
}

function updateSubcategory(transactionKey, event) {
    var updatedSubcategory = $('#subcategorySelect').select2('data')[0].text;
    console.log("Inside updateSubcategory: transactionKey ", transactionKey, "updatedSubcategory :", updatedSubcategory);

    if (updatedSubcategory) {
        $.ajax({
            type: 'POST',
            url: '/updateSubcategory',
            data: {
                transactionId: transactionKey,
                updatedSubcategory: updatedSubcategory
            },
            success: function (response) {
                console.log('Subcategory updated successfully:', response);
                var calendarValue = document.getElementById("calendarPicker").value;
                var [transactionYear, transactionMonth] = calendarValue.split("-");
                updateBudgetSummaryChart(transactionYear, transactionMonth);
                showTransactionDetails(event, previousSubcategory);
            },
            error: function (error) {
                console.error('Error updating subcategory:', error);
            }
        });
    } else {
        alert('Please select a subcategory before updating.');
    }
}

function budget_transaction_details_toggleDetails(button) {
    const card = button.closest('.budget_transaction_details_card');
    const body = card.querySelector('.budget_transaction_details_body');
    const statusElement = card.querySelector('.budget_transaction_details_status');

    if (body.style.display === 'none') {
        body.style.display = 'block';
        button.textContent = '▲';
        statusElement.textContent = 'Less ▲';
        statusElement.style.color = '#ff4d4d';
    } else {
        body.style.display = 'none';
        button.textContent = '▼';
        statusElement.textContent = 'More ▼';
        statusElement.style.color = '#00cc00';
    }
}

function budget_transaction_details_showSubcategoryDropdown(button) {
    $(button).hide();
    var field = $(button).closest('.budget_transaction_details_field');
    var dropdownLabel = field.find('.budget_transaction_details_subcategoryLabel');
    var subcategoryDropdown = field.find('#subcategorySelectMobile');
    var updateButton = field.find('.budget_transaction_details_updateSubcategoryButton');

    dropdownLabel.show();
    subcategoryDropdown.show();

    $.get('/getDistinctSubcategories', function (subcategories) {
        subcategoryDropdown.empty();
        subcategoryDropdown.select2({
            data: subcategories,
            width: '180px',
            placeholder: 'Select or type to search',
            allowClear: true,
        });
    });

    updateButton.show();
}

function budget_transaction_details_updateSubcategory(transactionKey, event) {
    var updatedSubcategory = $('#subcategorySelectMobile').select2('data')[0].text;
    console.log("Inside budget_transaction_details_updateSubcategory: transactionKey ", transactionKey, "updatedSubcategory :", updatedSubcategory);

    if (updatedSubcategory) {
        $.ajax({
            type: 'POST',
            url: '/updateSubcategory',
            data: {
                transactionId: transactionKey,
                updatedSubcategory: updatedSubcategory
            },
            success: function (response) {
                console.log('Subcategory updated successfully:', response);
                var calendarValue = document.getElementById("calendarPicker").value;
                var [transactionYear, transactionMonth] = calendarValue.split("-");
                updateBudgetSummaryChart(transactionYear, transactionMonth);
                showTransactionDetails(event, previousSubcategory);
            },
            error: function (error) {
                console.error('Error updating subcategory:', error);
            }
        });
    } else {
        alert('Please select a subcategory before updating.');
    }
}



document.addEventListener('DOMContentLoaded', () => {
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    const mainContent = document.querySelector('.main-content');
    const dropdownContainer = document.getElementById('dropdown-container');

    if (scrollToTopBtn && mainContent && dropdownContainer) {
        // Initially dim the button
        scrollToTopBtn.classList.add('dim-button');

        // Variable to track if the user is scrolling
        let isScrolling;

        // Function to check if the device is mobile (≤ 768px)
        const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

        // Listen for scroll events on main-content
        mainContent.addEventListener('scroll', () => {
            // Remove the dim-button class to reset the animation
            scrollToTopBtn.classList.remove('dim-button');
            // Make the button fully visible while scrolling
            scrollToTopBtn.style.opacity = '1';

            // Clear any existing timeout
            clearTimeout(isScrolling);

            // Set a timeout to detect when scrolling has stopped
            isScrolling = setTimeout(() => {
                // After scrolling stops, reapply the dim-button class to trigger the animation
                scrollToTopBtn.classList.add('dim-button');
            }, 150); // 150ms delay to determine scrolling has stopped
        });

        // Make the button fully visible on mouseover
        scrollToTopBtn.addEventListener('mouseover', () => {
            scrollToTopBtn.classList.remove('dim-button');
            scrollToTopBtn.style.opacity = '1';
        });

        // Allow the button to dim again when the mouse leaves
        scrollToTopBtn.addEventListener('mouseout', () => {
            if (!isScrolling) {
                scrollToTopBtn.classList.add('dim-button');
            }
        });

        // Make the button fully visible on touchstart (for mobile)
        scrollToTopBtn.addEventListener('touchstart', () => {
            scrollToTopBtn.classList.remove('dim-button');
            scrollToTopBtn.style.opacity = '1';
        });

        // Scroll behavior based on device type
        scrollToTopBtn.addEventListener('click', () => {
            if (isMobile()) {
                // On mobile: Scroll to just above the dropdown-container
                const dropdownPosition = dropdownContainer.getBoundingClientRect().top + mainContent.scrollTop - 20;
                mainContent.scrollTo({
                    top: dropdownPosition,
                    behavior: 'smooth'
                });
            } else {
                // On desktop: Scroll to the top of main-content
                mainContent.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        });
    }
});