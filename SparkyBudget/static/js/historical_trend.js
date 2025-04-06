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
        var transactionAmount = parseFloat(transaction_data[i][8]);
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
        case "Payee": return 5;
        case "Subcategory": return 6;
        default: return 6;
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
                color: '#E0E0E0',
                font: { weight: 'bold', size: 10 }
            }
        },
        axis: {
            x: {
                type: 'category',
                label: { text: 'Category', position: 'outer-center', color: '#E0E0E0', font: { weight: 'bold', size: 10 } }
            },
            y: {
                label: { text: 'Expense Amount', position: 'outer-middle', color: '#E0E0E0', font: { weight: 'bold', size: 10 } },
                tick: { format: function (value) { return '$' + Math.round(value); } }
            }
        },
        grid: { y: { lines: [{ value: 0 }] } },
        title: { text: 'Expense Trend' },
        legend: {
            show: false // Add this line to hide the legend
        }       
    });

    d3.selectAll('#bar_chart .c3-axis-x-label, #bar_chart .c3-axis-y-label').style('fill', '#E0E0E0');
    d3.select('#bar_chart .c3-title').style('fill', '#E0E0E0');
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

    myLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Salary',
                data: salaries,
                borderColor: '#FFD700',
                fill: false,
                datalabels: {
                    color: 'white',
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
                x: { ticks: { color: 'white' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                y: {
                    beginAtZero: true,
                    ticks: { color: 'white', callback: function(value) { return '$' + Math.round(value); } },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    title: { display: true, text: 'Salary', color: 'white' },
                    min: 5000
                }
            },
            plugins: {
                title: { display: true, text: 'Salary Trend', color: 'white', font: { size: 16, weight: 'bold' }, padding: { top: 10, bottom: 20 } },
                legend: { display: true, position: 'top', labels: { color: 'rgba(255, 255, 255, 1)' } },
                datalabels: { anchor: 'end', align: 'top', color: 'white', font: { weight: 'bold', size: 10 }, formatter: function(value) { return '$' + Math.round(value); } }
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
        "columnDefs": [{ "targets": [0, 1, 2, 7], "visible": false }],
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
                                var transactionId = rowData[7];

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
                            <span class="transaction_details_payee">${transaction[5]}</span>
                            <span class="transaction_details_date">${transaction[3]}</span>
                        </div>
                        <div class="transaction_details_amount_container">
                            <span class="transaction_details_amount">$${transaction[8].toFixed(2)}</span>
                            <span class="transaction_details_status" onclick="transaction_details_toggleDetails(this)">More ▼</span>
                        </div>
                    </div>
                    <div class="transaction_details_body" style="display: none;">
                        <div class="transaction_details_field">
                            <span class="transaction_details_label">Description:</span>
                            <span>${transaction[4]}</span>
                        </div>
                        <div class="transaction_details_field">
                            <span class="transaction_details_label">Subcategory:</span>
                            <span>${transaction[6]}</span>
                        </div>
                        <div class="transaction_details_field">
                            <span class="transaction_details_label">Amount:</span>
                            <span>$${transaction[8].toFixed(2)}</span>
                        </div>
                        <div class="transaction_details_field transaction-key" style="display: none;">
                            <span class="transaction_details_label">Transaction Key:</span>
                            <span>${transaction[7]}</span>
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
        const transactionKey = rowData[7];
        const transactionAmount = parseFloat(row.find('td:nth-child(9)').text().replace(/[^0-9.-]+/g, ""));

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

// Initial fetch for line chart
$(document).ready(function () {
    fetchLineChartData();
});