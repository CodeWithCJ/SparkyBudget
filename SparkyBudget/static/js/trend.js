// static/js/historical_trend.js

var table; // Define the table variable globally
var selectedOption = "Subcategory";

// Function to toggle details in mobile view
function transaction_details_toggleDetails(element) {
    const body = element.parentElement.parentElement.nextElementSibling;
    if (body.style.display === "none") {
        body.style.display = "block";
        element.textContent = "Less ▲";
    } else {
        body.style.display = "none";
        element.textContent = "More ▼";
    }
}

// Aggregate data and related functions in global scope
function aggregateData(transaction_data, selectedOption) {
    var aggregatedData = {};
    for (var i = 0; i < transaction_data.length; i++) {
        var selectedField = transaction_data[i][getIndexForSelectedOption(selectedOption)];
        var transactionAmount = parseFloat(transaction_data[i][9]); // Updated index from 8 to 9
        var key = selectedField;
        if (aggregatedData[key]) {
            aggregatedData[key].count += 1;
            aggregatedData[key].totalAmount += isNaN(transactionAmount) ? 0 : transactionAmount;
        } else {
            aggregatedData[key] = {
                count: 1,
                totalAmount: isNaN(transactionAmount) ? 0 : transactionAmount
            };
        }
    }
    for (var key in aggregatedData) {
        if (aggregatedData.hasOwnProperty(key)) {
            aggregatedData[key].totalAmount = Math.round(Math.abs(aggregatedData[key].totalAmount));
        }
    }
    console.log("My aggregated data is ", aggregatedData);
    updateChart(aggregatedData);
}

function getIndexForSelectedOption(selectedOption) {
    switch (selectedOption) {
        case "Year": return 0;
        case "Month": return 1;
        case "FormattedMonth": return 2;
        case "Payee": return 6; // Updated index from 5 to 6
        case "Subcategory": return 7; // Updated index from 6 to 7
        default: return 7; // Updated default index from 6 to 7
    }
}

function updateChart(aggregatedData) {
    var excludedCategories = ["Money Transfer", "Paycheck", "Interest Income", "CC Payment", "Transfer", "Credit Card Payment", "Transfer"];
    var filteredData = Object.entries(aggregatedData)
        .filter(([category, data]) => !excludedCategories.includes(category))
        .reduce((obj, [category, data]) => {
            obj[category] = data.totalAmount;
            return obj;
        }, {});

    var categories = Object.keys(filteredData);
    var totalAmounts = Object.values(filteredData);

    for (var i = 0; i < categories.length; i++) {
        var category = categories[i];
        if (isNaN(filteredData[category])) {
            console.error("NaN value found in totalAmount for category:", category, filteredData[category]);
            filteredData[category] = 0;
        }
    }

    var categoryColors = generateCategoryColors(categories.length);

    var chart = c3.generate({
        bindto: '#bar_chart',
        data: {
            x: 'Category',
            columns: [
                ['Category'].concat(categories),
                ['Expense Amount'].concat(totalAmounts)
            ],
            type: 'bar',
            color: function (color, d) {
                return categoryColors[d.index % categoryColors.length];
            },
            labels: {
                format: function (v, id, i, j) {
                    return '$' + Math.round(v);
                },
                color: textColor, // Use theme-dependent color
                font: { weight: 'bold', size: 10 }
            }
        },
        axis: {
            x: {
                type: 'category',
                label: { text: 'Category', position: 'outer-center', color: textColor, font: { weight: 'bold', size: 10 } }, // Use theme-dependent color
                tick: {
                    text: {
                        fill: textColor // Use theme-dependent color for tick text
                    }
                }
            },
            y: {
                label: { text: 'Expense Amount', position: 'outer-middle', color: textColor, font: { weight: 'bold', size: 10 } }, // Use theme-dependent color
                tick: {
                    format: function (value) { return '$' + Math.round(value); },
                    text: {
                        fill: textColor // Use theme-dependent color for tick text
                    }
                },
                grid: {
                    lines: [{ value: 0, position: 'start', class: 'grid-line' }] // Add class for styling
                }
            }
        },
        grid: { y: { lines: [{ value: 0 }] } },
        title: { text: 'Expense Trend', color: textColor }, // Use theme-dependent color
        legend: {
            show: false // Add this line to hide the legend
        }
    });

    // Update C3.js elements using D3.js with theme-dependent color
    d3.selectAll('#bar_chart .c3-axis-x-label, #bar_chart .c3-axis-y-label').style('fill', textColor);
    d3.select('#bar_chart .c3-title').style('fill', textColor);
    d3.selectAll('#bar_chart .c3-axis-x .tick text, #bar_chart .c3-axis-y .tick text').style('fill', textColor);
}

function generateCategoryColors(numCategories) {
   // Keep random color generation, but ensure visibility in both themes
   // This might require a more sophisticated approach for better contrast
   // For now, we'll keep the random generation.
    var colors = [];
    for (var i = 0; i < numCategories; i++) {
        var color = '#' + Math.floor(Math.random() * 16777215).toString(16);
        colors.push(color);
    }
    return colors;
}

// Add a function to get theme-dependent colors for C3.js
function getC3ThemeColors() {
    const isLightTheme = document.body.classList.contains('light-theme');
    return {
        textColor: isLightTheme ? '#444444' : 'white',
        gridColor: isLightTheme ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
    };
}

// Modify updateChart to use theme-dependent colors
function updateChart(aggregatedData) {
    var excludedCategories = ["Money Transfer", "Paycheck", "Interest Income", "CC Payment", "Transfer", "Credit Card Payment", "Transfer"];
    var filteredData = Object.entries(aggregatedData)
        .filter(([category, data]) => !excludedCategories.includes(category))
        .reduce((obj, [category, data]) => {
            obj[category] = data.totalAmount;
            return obj;
        }, {});

    var categories = Object.keys(filteredData);
    var totalAmounts = Object.values(filteredData);

    for (var i = 0; i < categories.length; i++) {
        var category = categories[i];
        if (isNaN(filteredData[category])) {
            console.error("NaN value found in totalAmount for category:", category, filteredData[category]);
            filteredData[category] = 0;
        }
    }

    var categoryColors = generateCategoryColors(categories.length);
    const { textColor, gridColor } = getC3ThemeColors(); // Get theme colors

    var chart = c3.generate({
        bindto: '#bar_chart',
        data: {
            x: 'Category',
            columns: [
                ['Category'].concat(categories),
                ['Expense Amount'].concat(totalAmounts)
            ],
            type: 'bar',
            color: function (color, d) {
                return categoryColors[d.index % categoryColors.length];
            },
            labels: {
                format: function (v, id, i, j) {
                    return '$' + Math.round(v);
                },
                color: textColor, // Use theme-dependent color
                font: { weight: 'bold', size: 10 }
            }
        },
        axis: {
            x: {
                type: 'category',
                label: { text: 'Category', position: 'outer-center', color: textColor, font: { weight: 'bold', size: 10 } }, // Use theme-dependent color
                tick: {
                    text: {
                        fill: textColor // Use theme-dependent color for tick text
                    }
                }
            },
            y: {
                label: { text: 'Expense Amount', position: 'outer-middle', color: textColor, font: { weight: 'bold', size: 10 } }, // Use theme-dependent color
                tick: {
                    format: function (value) { return '$' + Math.round(value); },
                    text: {
                        fill: textColor // Use theme-dependent color for tick text
                    }
                },
                grid: {
                    lines: [{ value: 0, position: 'start', class: 'grid-line' }] // Add class for styling
                }
            }
        },
        grid: { y: { lines: [{ value: 0, class: 'grid-line' }] } }, // Add class for styling
        title: { text: 'Expense Trend', color: textColor }, // Use theme-dependent color
        legend: {
            show: false // Add this line to hide the legend
        }
    });

    // Update C3.js elements using D3.js with theme-dependent color
    d3.selectAll('#bar_chart .c3-axis-x-label, #bar_chart .c3-axis-y-label').style('fill', textColor);
    d3.select('#bar_chart .c3-title').style('fill', textColor);
    d3.selectAll('#bar_chart .c3-axis-x .tick text, #bar_chart .c3-axis-y .tick text').style('fill', textColor);
    d3.selectAll('#bar_chart .c3-grid line').style('stroke', gridColor); // Style grid lines
}

function generateCategoryColors(numCategories) {
    var colors = [];
    for (var i = 0; i < numCategories; i++) {
        var color = '#' + Math.floor(Math.random() * 16777215).toString(16);
        colors.push(color);
    }
    return colors;
}

// Line chart functions moved to global scope
function fetchLineChartData() {
    $.ajax({
        url: '/salary_chart_data',
        method: 'GET',
        success: function (lineChartData) {
            renderLineChart(lineChartData);
        },
        error: function (error) {
            console.error('Error fetching line chart data:', error);
        }
    });
}

let myLineChart = null; // Store the chart instance globally


function renderLineChart(lineChartData) {
    const dates = lineChartData.map(entry => entry[0]);
    const salaries = lineChartData.map(entry => entry[1]);
    const ctx = document.getElementById('lineChartCanvas').getContext('2d');

    // Check if a chart already exists and destroy it
    if (myLineChart) {
        myLineChart.destroy();
    }

    const isLightTheme = document.body.classList.contains('light-theme');
    const textColor = isLightTheme ? '#444444' : 'white'; // Use dark gray for light theme, white for dark
    const gridColor = isLightTheme ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'; // Use light gray for light theme, white for dark

    myLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Salary',
                data: salaries,
                borderColor: '#FFD700', // Keep line color consistent
                fill: false,
                datalabels: {
                    color: textColor, // Use theme-dependent color
                    align: 'top',
                    font: { weight: 'bold', size: 10 },
                    formatter: function(value) { return '$' + Math.round(value); }
                }
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            scales: {
                x: { ticks: { color: textColor }, grid: { color: gridColor } }, // Use theme-dependent colors
                y: {
                    beginAtZero: true,
                    ticks: { color: textColor, callback: function(value) { return '$' + Math.round(value); } }, // Use theme-dependent colors
                    grid: { color: gridColor }, // Use theme-dependent color
                    title: { display: true, text: 'Salary', color: textColor }, // Use theme-dependent color
                    min: 5000
                }
            },
            plugins: {
                title: { display: true, text: 'Salary Trend', color: textColor, font: { size: 16, weight: 'bold' }, padding: { top: 10, bottom: 20 } }, // Use theme-dependent color
                legend: { display: true, position: 'top', labels: { color: textColor } }, // Use theme-dependent color
                datalabels: { anchor: 'end', align: 'top', color: textColor, font: { weight: 'bold', size: 10 }, formatter: function(value) { return '$' + Math.round(value); } } // Use theme-dependent color
            }
        },
        plugins: [ChartDataLabels]
    });

    console.log("lineChart:", myLineChart);
}

// DataTable initialization
$(document).ready(function () {
    table = $('#transactionTable').DataTable({
        "orderClasses": false,
        "pageLength": 15,
        "order": [],
        dom: 'Bfrtip',
        buttons: ['csv', 'excel', 'pdf'],
        "columnDefs": [{ "targets": [0, 1, 2, 8], "visible": false }], // Updated index for Transaction Key from 7 to 8
        "stripeClasses": [],
        "createdRow": function (row, data, index) {
            $(row).addClass('custom-row-class');
            var reCategorizeButton = $(row).find('.re-categorize-button');
            var subcategoryDropdown = $(row).find('.subcategory-dropdown');

            reCategorizeButton.on('click', function () {
                subcategoryDropdown.toggle();
                reCategorizeButton.hide();
                if (subcategoryDropdown.is(':visible')) {
                    $.ajax({
                        url: '/getDistinctSubcategories',
                        method: 'GET',
                        success: function (response) {
                            subcategoryDropdown.html('<select class="subcategory-select"></select>');
                            var subcategorySelect = subcategoryDropdown.find('.subcategory-select');
                            subcategorySelect.select2({
                                data: response.map(function (subcategory) {
                                    return { id: subcategory, text: subcategory };
                                }),
                                placeholder: 'Select a subcategory',
                                allowClear: true,
                                width: '200px'
                            });

                            subcategorySelect.on('select2:open', function () {
                                $('.select2-dropdown--below').addClass('dark-theme');
                            });

                            var customStyles = `
                                .dark-theme {
                                    background-color: #333 !important;
                                    color: #fff !important;
                                }
                                .dark-theme .select2-results__option {
                                    color: #fff !important;
                                }
                            `;
                            $('head').append('<style>' + customStyles + '</style>');

                            subcategorySelect.on('select2:select', function (e) {
                                var updatedSubcategory = e.params.data.text;
                                var rowData = table.row($(row)).data();
                                var transactionId = rowData[8]; // Updated index from 7 to 8

                                $.ajax({
                                    url: '/updateSubcategory',
                                    method: 'POST',
                                    data: { transactionId: transactionId, updatedSubcategory: updatedSubcategory },
                                    success: function (response) {
                                        console.log('Subcategory updated successfully:', response);
                                    },
                                    error: function (error) {
                                        console.error('Error updating subcategory:', error);
                                        $('<div></div>').appendTo('body')
                                            .html('<div><h6>Error updating subcategory: ' + error + '</h6></div>')
                                            .dialog({
                                                modal: true, title: 'Error', zIndex: 10000, autoOpen: true,
                                                width: 'auto', resizable: false,
                                                close: function () { $(this).remove(); }
                                            });
                                    }
                                });
                            });
                        },
                        error: function (error) {
                            console.error('Error loading subcategories:', error);
                        }
                    });
                }
            });
        }
    });

    $('.transaction-table-mobile-container').on('click', '.re-categorize-button', function () {
        var card = $(this).closest('.transaction_details_card');
        var subcategoryDropdown = card.find('.subcategory-dropdown');
        subcategoryDropdown.toggle();
        $(this).hide();

        if (subcategoryDropdown.is(':visible')) {
            $.ajax({
                url: '/getDistinctSubcategories',
                method: 'GET',
                success: function (response) {
                    subcategoryDropdown.html('<select class="subcategory-select"></select>');
                    var subcategorySelect = subcategoryDropdown.find('.subcategory-select');
                    subcategorySelect.select2({
                        data: response.map(function (subcategory) {
                            return { id: subcategory, text: subcategory };
                        }),
                        placeholder: 'Select a subcategory',
                        allowClear: true,
                        width: '200px'
                    });

                    subcategorySelect.on('select2:select', function (e) {
                        var updatedSubcategory = e.params.data.text;
                        var transactionId = card.find('.transaction-key span:last').text();

                        $.ajax({
                            url: '/updateSubcategory',
                            method: 'POST',
                            data: { transactionId: transactionId, updatedSubcategory: updatedSubcategory },
                            success: function (response) {
                                console.log('Subcategory updated successfully:', response);
                            },
                            error: function (error) {
                                console.error('Error updating subcategory:', error);
                            }
                        });
                    });
                },
                error: function (error) {
                    console.error('Error loading subcategories:', error);
                }
            });
        }
    });
});

$(document).ready(function () {
    aggregateData(window.appState.transaction_data, selectedOption);
    $('#dropdown_select').on('change', function () {
        selectedOption = $(this).val();
        aggregateData(window.appState.transaction_data, selectedOption);
    });
});

// Date Range Picker with AJAX
$(function () {
    var lastMonthStart = moment().subtract(1, 'month').startOf('month');
    var lastMonthEnd = moment().subtract(1, 'month').endOf('month');
    var currentMonthStart = moment().startOf('month');
    var currentMonthEnd = moment().endOf('month');
    $('#date_range').daterangepicker({
        startDate: currentMonthStart,
        endDate: currentMonthEnd,
        locale: { cancelLabel: 'Clear' },
        ranges: {
            'This month': [moment().startOf('month'), moment().endOf('month')],
            'Last month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
            '3 months': [moment().subtract(3, 'months'), moment()],
            '6 months': [moment().subtract(6, 'months'), moment()],
            '12 months': [moment().subtract(12, 'months'), moment()],
            'Qtr': [moment().startOf('quarter'), moment().endOf('quarter')],
            'Half Year': [moment().subtract(6, 'months').startOf('month'), moment()],
            'This year': [moment().startOf('year'), moment().endOf('year')],
            'Last year': [moment().startOf('year').subtract(1, 'year'), moment().endOf('year').subtract(1, 'year')]
        }
    });

    $('#date_range').on('apply.daterangepicker', function (ev, picker) {
        $('#start_date').val(picker.startDate.format('MM/DD/YYYY'));
        $('#end_date').val(picker.endDate.format('MM/DD/YYYY'));

        if (!picker.startDate.isSame(picker.endDate)) {
            $(this).val(picker.startDate.format('MM/DD/YYYY') + ' - ' + picker.endDate.format('MM/DD/YYYY'));
        } else {
            $(this).val(picker.startDate.format('MM/DD/YYYY'));
        }

        $.ajax({
            url: '/get_transaction_data',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                start_date: picker.startDate.format('MM/DD/YYYY'),
                end_date: picker.endDate.format('MM/DD/YYYY')
            }),
            success: function (response) {
                if (response.transaction_data) {
                    window.appState.transaction_data = response.transaction_data;
                    aggregateData(window.appState.transaction_data, selectedOption);
                    fetchLineChartData();
                    updateTransactionTable(response.transaction_data);
                    updateMobileCards(response.transaction_data);
                    fetchIncomeExpenseChartData();
                    fetchSpendingTrendChartData();
                } else {
                    console.error('No transaction data in response:', response);
                }
            },
            error: function (error) {
                console.error('Error fetching transaction data:', error);
                alert('Failed to update data: ' + (error.responseJSON?.error || 'Unknown error'));
            }
        });
    });

    $('#date_range').on('cancel.daterangepicker', function (ev, picker) {
        $(this).val('');
        $('#start_date').val('');
        $('#end_date').val('');
    });

    function updateTransactionTable(transactionData) {
        table.clear();
        transactionData.forEach(function (transaction) {
            table.row.add([
                transaction[0], // Year
                transaction[1], // Month
                transaction[2], // Formatted Month
                transaction[3], // Transaction Date
                transaction[4], // Description
                transaction[5], // Payee
                transaction[6], // Subcategory
                transaction[7], // Transaction Key
                '$' + transaction[8].toFixed(2), // Transaction Amount
                '<div class="subcategory-cell"><button class="re-categorize-button">Re-categorize</button><div class="subcategory-dropdown" style="display: none;"></div></div>',
                '<button class="split-button">Split</button>'
            ]);
        });
        table.draw();
    }

    function updateMobileCards(transactionData) {
        var mobileContainer = $('.transaction-table-mobile-container');
        mobileContainer.empty();
        transactionData.forEach(function (transaction) {
            var cardHtml = `
                <div class="transaction_details_card">
                    <div class="transaction_details_header">
                        <div class="transaction_details_info">
                            <span class="transaction_details_payee">${transaction[6]}</span> {# Payee is now at index 6 #}
                            <span class="transaction_details_date">${transaction[3]}</span> {# Transaction Date is still at index 3 #}
                        </div>
                        <div class="transaction_details_amount_container">
                            <span class="transaction_details_amount">$${transaction[9].toFixed(2)}</span> {# Amount is now at index 9 #}
                            <span class="transaction_details_status" onclick="transaction_details_toggleDetails(this)">More ▼</span>
                        </div>
                    </div>
                    <div class="transaction_details_body" style="display: none;">
                        <div class="transaction_details_field">
                            <span class="transaction_details_label">Description:</span>
                            <span>${transaction[5]}</span> {# Description is now at index 5 #}
                        </div>
                         <div class="transaction_details_field"> {# Add Account field #}
                            <span class="transaction_details_label">Account:</span>
                            <span>${transaction[4]}</span> {# AccountDisplayName is at index 4 #}
                        </div>
                        <div class="transaction_details_field">
                            <span class="transaction_details_label">Subcategory:</span>
                            <span>${transaction[7]}</span> {# Subcategory is now at index 7 #}
                        </div>
                        <div class="transaction_details_field">
                            <span class="transaction_details_label">Amount:</span>
                            <span>$${transaction[9].toFixed(2)}</span> {# Amount is now at index 9 #}
                        </div>
                        <div class="transaction_details_field transaction-key" style="display: none;">
                            <span class="transaction_details_label">Transaction Key:</span>
                            <span>${transaction[8]}</span> {# Transaction Key is now at index 8 #}
                        </div>
                        <div class="transaction_details_field">
                            <button class="transaction_details_reCategorizeButton re-categorize-button">Re-categorize</button>
                            <div class="transaction_details_subcategoryDropdown subcategory-dropdown" style="display: none;"></div>
                        </div>
                        <div class="transaction_details_field">
                            <button class="transaction_details_splitButton split-button">Split</button>
                        </div>
                    </div>
                </div>
            `;
            mobileContainer.append(cardHtml);
        });
    }
});

// JS Code for Add Transaction
$(document).ready(function () {
    $('#addTransactionButton').on('click', function () {
        const today = new Date().toISOString().split('T')[0];
        $('#transactionDateInput').val(today);
        $('#addTransactionPopup').fadeIn();
    });

    $('#closeTransactionPopupButton, #cancelTransactionButton').on('click', function () {
        $('#addTransactionPopup').fadeOut();
    });

    $('#addTransactionPopup').on('click', function (e) {
        if ($(e.target).is('#addTransactionPopup')) {
            $('#addTransactionPopup').fadeOut();
        }
    });
});

$(document).ready(function () {
    $('#addTransactionForm').on('submit', function (e) {
        e.preventDefault();
        const formData = {
            transactionDate: $('#transactionDateInput').val(),
            accountID: $('#accountSelectInput').val(),
            accountName: $('#accountSelectInput option:selected').text(),
            description: $('#transactionDescriptionInput').val(),
            payee: $('#transactionPayeeInput').val(),
            memo: $('#transactionMemoInput').val(),
            amount: parseFloat($('#transactionAmountInput').val()),
            subcategory: $('#subcategorySelectInput').val()
        };

        if (formData.amount === 0 || isNaN(formData.amount)) {
            alert('Amount must be a non-zero number.');
            return;
        }

        $.ajax({
            url: '/addTransaction',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function (response) {
                if (response.success) {
                    alert('Transaction added successfully!');
                    location.reload();
                } else {
                    alert('Failed to add transaction: ' + response.error);
                }
            },
            error: function (xhr, status, error) {
                alert('An error occurred: ' + xhr.responseText);
            }
        });
    });
});

$(document).ready(function () {
    let accountData = [];
    $.ajax({
        url: '/getAccounts',
        dataType: 'json',
        success: function (data) {
            accountData = data;
            $('#accountSelectInput').select2({
                data: accountData,
                placeholder: 'Select an account',
                allowClear: true,
                matcher: function (params, data) {
                    if ($.trim(params.term) === '') return data;
                    if (data.text.toLowerCase().includes(params.term.toLowerCase())) return data;
                    return null;
                }
            });
        },
        error: function (xhr, status, error) {
            console.error('Error fetching accounts:', error);
        }
    });
});

$(document).ready(function () {
    let subcategoryData = [];
    $.ajax({
        url: '/getDistinctSubcategories',
        dataType: 'json',
        success: function (data) {
            subcategoryData = data.map(subcategory => ({ id: subcategory, text: subcategory }));
            $('#subcategorySelectInput').select2({
                data: subcategoryData,
                placeholder: 'Select a subcategory',
                allowClear: true,
                matcher: function (params, data) {
                    if ($.trim(params.term) === '') return data;
                    if (data.text.toLowerCase().includes(params.term.toLowerCase())) return data;
                    return null;
                }
            });
        },
        error: function (xhr, status, error) {
            console.error('Error fetching subcategories:', error);
        }
    });
});

$(document).ready(function () {
    let splitSubcategoryData = [];
    $.ajax({
        url: '/getDistinctSubcategories',
        method: 'GET',
        dataType: 'json',
        success: function (data) {
            splitSubcategoryData = data.map(subcategory => ({ id: subcategory, text: subcategory }));
            $('#splitTransactionSubcategorySelect').select2({
                data: splitSubcategoryData,
                placeholder: 'Select a subcategory',
                allowClear: true,
                matcher: function (params, data) {
                    if ($.trim(params.term) === '') return data;
                    if (data.text.toLowerCase().includes(params.term.toLowerCase())) return data;
                    return null;
                }
            });
        },
        error: function (error) {
            console.error('Error fetching subcategories for split transaction:', error);
        }
    });

    $('#transactionTable').on('click', '.split-button', function () {
        const row = $(this).closest('tr');
        const rowData = table.row(row).data();
        const transactionKey = rowData[8]; // Updated index from 7 to 8
        const transactionAmount = parseFloat(row.find('td:nth-child(10)').text().replace(/[^0-9.-]+/g, "")); // Updated nth-child from 9 to 10

        $('#splitTransactionPopup').data('transactionKey', transactionKey);
        $('#splitTransactionPopup').data('transactionAmount', transactionAmount);
        $('#splitTransactionPopup').fadeIn();
    });

    $('#splitTransactionCloseButton, #splitTransactionCancelButton').on('click', function () {
        $('#splitTransactionPopup').fadeOut();
    });

    $('#splitTransactionPopup').on('click', function (e) {
        if ($(e.target).is('#splitTransactionPopup')) {
            $('#splitTransactionPopup').fadeOut();
        }
    });

    $('#splitTransactionForm').on('submit', function (e) {
        e.preventDefault();
        const transactionKey = $('#splitTransactionPopup').data('transactionKey');
        const transactionAmount = $('#splitTransactionPopup').data('transactionAmount');
        const splitAmountInput = $('#splitTransactionAmountInput').val().trim();
        const splitAmount = parseFloat(splitAmountInput);
        const subcategory = $('#splitTransactionSubcategorySelect').val();

        if (!splitAmountInput || isNaN(splitAmount) || splitAmount <= 0 || Math.abs(splitAmount) >= Math.abs(transactionAmount)) {
            alert("Invalid amount! Please enter a number between 0 and " + Math.abs(transactionAmount));
            return;
        }

        if (!subcategory) {
            alert("Please select a subcategory!");
            return;
        }

        const adjustedSplitAmount = transactionAmount < 0 ? -Math.abs(splitAmount) : Math.abs(splitAmount);

        $.ajax({
            url: '/splitTransaction',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                transactionKey: transactionKey,
                splitAmount: adjustedSplitAmount,
                newSubcategory: subcategory
            }),
            success: function (response) {
                alert("Transaction split successfully!");
                location.reload();
            },
            error: function (error) {
                console.error("Error splitting transaction:", error.responseJSON?.error || error);
                alert("Failed to split transaction: " + (error.responseJSON?.error || "Unknown error"));
            }
        });

        $('#splitTransactionPopup').fadeOut();
    });
});

    // Event handler for split button in mobile view
    $('.transaction-table-mobile-container').on('click', '.split-button', function () {
        const card = $(this).closest('.transaction_details_card');
        const transactionKey = card.find('.transaction-key span:last').text(); // Get transaction key from hidden field
        const transactionAmountText = card.find('.transaction_details_amount').text();
        const transactionAmount = parseFloat(transactionAmountText.replace(/[^0-9.-]+/g, "")); // Extract and parse amount

        $('#splitTransactionPopup').data('transactionKey', transactionKey);
        $('#splitTransactionPopup').data('transactionAmount', transactionAmount);
        $('#splitTransactionPopup').fadeIn();
    });

// Initial fetch for line chart
$(document).ready(function () {
    fetchLineChartData();
    fetchIncomeExpenseChartData();
    fetchSpendingTrendChartData();
});




// Global variable to hold the income vs. expense chart instance
let incomeExpenseChart = null;


// Function to fetch data for the income vs. expense chart
function fetchIncomeExpenseChartData() {
    $.ajax({
        url: '/income_expense_chart', // Corrected URL path
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            start_date: $('#start_date').val(), // Get dates from the date range picker
            end_date: $('#end_date').val()
        }),
        success: function (response) {
            if (response.data) {
                renderIncomeExpenseChart(response.data);
                renderNetCashFlowChart(response.data);
            } else {
                console.error('No income/expense data in response:', response);
            }
        },
        error: function (error) {
            console.error('Error fetching income/expense chart data:', error);
        }
    });
}

// Function to render the income vs. expense chart
function renderIncomeExpenseChart(chartData) {
    const ctx = document.getElementById('incomeExpenseChartCanvas').getContext('2d');

    // Destroy existing chart if it exists
    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
    }

    // Prepare labels and data for the chart
    const labels = chartData.map(item => item.YearMonth);
    const incomeData = chartData.map(item => item.Income);
    const expenseData = chartData.map(item => item.ExpenseAmount);
    const budgetData = chartData.map(item => item.BudgetAmount);

    incomeExpenseChart = new Chart(ctx, {
        type: 'bar', // Use a combo chart: bars for income/expense, line for budget
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)', // Green-ish color
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    type: 'bar',
                    datalabels: { // Data labels for Income bars
                        display: function(context) {
                            // Only show datalabels on desktop for bars
                            return context.dataset.type === 'bar' && window.innerWidth > 768;
                        },
                        anchor: 'end',
                        align: 'top',
                        color: 'white',
                        font: {
                            weight: 'bold',
                            size: 10
                        },
                        formatter: function (value) {
                            return '$' + Math.round(value);
                        }
                    }
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',  // Red-ish color
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                    type: 'bar',
                    datalabels: { // Data labels for Expense bars
                        display: function(context) {
                            // Only show datalabels on desktop for bars
                            return context.dataset.type === 'bar' && window.innerWidth > 768;
                        },
                        anchor: 'end',
                        align: 'top',
                        color: 'white',
                        font: {
                            weight: 'bold',
                            size: 10
                        },
                        formatter: function (value) {
                            return '$' + Math.round(value);
                        }
                    }
                },
                {
                    label: 'Budget',
                    data: budgetData,
                    borderColor: 'rgba(255, 205, 86, 1)',   // Yellow-ish color
                    borderWidth: 2,
                    type: 'line',
                    fill: false,
                    datalabels: {  // Data labels for Budget line (explicitly disabled)
                        display: false
                    }
                }
            ]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            scales: {
                x: {
                    stacked: false,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'white',
                        callback: function (value) {
                            return '$' + Math.round(value);
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Income vs. Expenses vs. Budget',
                    color: 'white',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: true,
                    labels: {
                        color: document.body.classList.contains('light-theme') ? '#000' : 'white'
                    }
                },
            }
        },
        plugins: [ChartDataLabels]
    });
}




// Global variable to hold the Net Cash Flow chart instance
let netCashFlowChart = null;

// Function to render the Net Cash Flow chart
function renderNetCashFlowChart(chartData) {
    const ctx = document.getElementById('netCashFlowChartCanvas').getContext('2d');

    // Destroy existing chart if it exists
    if (netCashFlowChart) {
        netCashFlowChart.destroy();
    }

    // Prepare labels, income, expense, and net cash flow data
    const labels = chartData.map(item => item.YearMonth);
    const incomeData = chartData.map(item => item.Income);
    const expenseData = chartData.map(item => -item.ExpenseAmount); // Expenses remains as positive value
    const netCashFlowData = chartData.map((item, index) => item.Income - item.ExpenseAmount); // Calculate Net Cash Flow
    console.log(netCashFlowData);

    // Ensure that even if all values in chartData are zero, we'll display meaningful scaling
    const maxY = Math.max(...incomeData) + (Math.max(...incomeData) / 2); // Adding 50% padding to Max Y
    const minY = Math.min(...expenseData) + (Math.min(...expenseData) / 2); // Subtracting 50% padding to Min Y

    // Determine line colors based on net cash flow (above or below zero)
    const netCashFlowColors = netCashFlowData.map(value => value >= 0 ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)');

    netCashFlowChart = new Chart(ctx, {
        type: 'bar',  // Combo chart: bars for income/expense, line for net cash flow
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)', // Green-ish color
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    type: 'bar',
                    order: 2,
                    datalabels: {
                        display: function (context) {
                            // Only show datalabels on desktop for bars
                            return context.dataset.label === 'Income' && window.innerWidth > 768;
                        },
                        anchor: 'end',
                        align: 'top',
                        color: 'white',
                        font: {
                            weight: 'bold',
                            size: 10
                        },
                        formatter: function (value) {
                            return '$' + Math.round(value);
                        }
                    }
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',  // Red-ish color
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                    type: 'bar',
                    order: 2,
                    datalabels: {
                        display: function (context) {
                            // Only show datalabels on desktop for bars
                            return context.dataset.label === 'Expenses' && window.innerWidth > 768;
                        },
                        anchor: 'end',
                        align: 'bottom', // Position the labels at the bottom of the negative bars
                        color: 'white',
                        font: {
                            weight: 'bold',
                            size: 10
                        },
                        formatter: function (value) {
                            return '$' + Math.abs(Math.round(value));  // Display positive value
                        }
                    }
                },
                {
                    label: 'Net Cash Flow',
                    data: netCashFlowData,
                    borderColor: netCashFlowColors,  // Use conditional colors for the line
                    borderWidth: 2,
                    type: 'line',
                    fill: false,
                    pointRadius: 5,
                    order: 1,
                    datalabels: {  // ADD data lable
                        display: window.innerWidth > 768,  // to show on desktop
                        anchor: 'top',  // Adjust the anchor point as needed (e.g., 'top', 'bottom')
                        align: 'center', // or 'left' or 'right', depending on the look you want
                        color: 'white',  // Set the data label color to white
                        font: {
                            weight: 'bold',
                            size: 10
                        },
                        formatter: function (value) {
                            return '$' + Math.round(value);
                        }
                    }
                }
            ]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            scales: {
                x: {
                    stacked: false,
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    suggestedMin: minY,
                    suggestedMax: maxY,
                    ticks: {
                        color: 'white',
                        callback: function (value) {
                            return '$' + Math.round(value);
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Net Cash Flow',
                    color: 'white',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: true,
                    labels: {
                        color: 'white'
                    }
                },
            }
        },
        plugins: [ChartDataLabels]
    });
}



// Global variable to hold the Spending Trend By Category chart instance
let spendingTrendChart = null;

// Function to render the Spending Trend By Category chart
function renderSpendingTrendChart(chartData) {
    const ctx = document.getElementById('spendingTrendChartCanvas').getContext('2d');

    // Destroy existing chart if it exists
    if (spendingTrendChart) {
        spendingTrendChart.destroy();
    }

    const isLightTheme = document.body.classList.contains('light-theme');
    const textColor = isLightTheme ? '#444444' : 'white'; // Use dark gray for light theme, white for dark
    const gridColor = isLightTheme ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'; // Use light gray for light theme, white for dark

    // Prepare data for the chart: group by YearMonth and Category
    const groupedData = {};
    chartData.forEach(item => {
        if (!groupedData[item.YearMonth]) {
            groupedData[item.YearMonth] = {};
        }
        groupedData[item.YearMonth][item.Category] = item.ExpenseAmount;
    });

    // Extract labels (YearMonth) and categories
    const labels = Object.keys(groupedData);
    const categories = [...new Set(chartData.map(item => item.Category))]; // Unique categories

     // Define a specific color palette (adjust to match your mockup)
     const categoryColors = [
        'rgba(148, 148, 255, 0.4)', //Auto & Transport  // Housing
        'rgba(60, 179, 113, 0.6)',   //Food & Dining  // Food
        'rgba(255, 165, 0, 0.7)',    // Home   // Transportation
        'rgba(255, 69, 0, 0.6)',     //Others   // Utilities
        'rgba(128, 0, 128, 0.4)',   // Shopping  // Entertainment
        'rgba(139, 69, 19, 0.4)',   // Transfer  // Other
        'rgba(148, 148, 255, 0.6)', //Auto & Transport  // Housing
        'rgba(60, 179, 113, 0.4)',   //Food & Dining  // Food
        'rgba(255, 165, 0, 0.5)',    // Home   // Transportation
    ];

    // Create datasets for each category
    const datasets = categories.map((category, index) => {
        const data = labels.map(label => groupedData[label][category] || 0); // ExpenseAmount for each month, 0 if not present
        return {
            label: category,
            data: data,
            backgroundColor: categoryColors[index % categoryColors.length],  // Assign color from the palette
            borderColor: 'rgba(255, 255, 255, 0.1)',  // Subtle border
            borderWidth: 1,
            fill: true,  // Fill the area under the line
            tension: 0.4, // to show curved lines
        };
    });

    spendingTrendChart = new Chart(ctx, {
        type: 'line',  // Stacked area chart
        data: {
            labels: labels,
            datasets: datasets,
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            scales: {
                x: {
                    stacked: true,
                    ticks: { color: textColor }, // Use theme-dependent color
                    grid: { color: gridColor } // Use theme-dependent color
                },
                y: {
                    stacked: true,
                    ticks: {
                        color: textColor, // Use theme-dependent color
                        callback: function (value) {
                            return '$' + Math.round(value);
                        }
                    },
                    grid: { color: gridColor } // Use theme-dependent color
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Spending Trend by Category',
                    color: textColor, // Use theme-dependent color
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                tooltip: {
                     mode: 'index',  // Show all series on hover at same point
                    intersect: false  // Don't need to be directly over a data point
                },
                legend: {
                    display: true,
                    labels: {
                        color: textColor // Use theme-dependent color
                    }
                },
            },
        },
    });
}
// Helper function to generate a random color
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Function to fetch data for the Spending Trend by Category chart
function fetchSpendingTrendChartData() {
    $.ajax({
        url: '/spending_trend_by_category',  // The URL to fetch data from the new endpoint you will provide to flask.
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            start_date: $('#start_date').val(),
            end_date: $('#end_date').val()
        }),
        success: function (response) {
            if (response.data) {
                renderSpendingTrendChart(response.data);
            } else {
                console.error('No spending trend data in response:', response);
            }
        },
        error: function (error) {
            console.error('Error fetching spending trend data:', error);
        }
    });
}

