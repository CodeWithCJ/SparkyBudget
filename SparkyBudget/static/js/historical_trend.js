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

// Update the DataTable initialization to handle both desktop and mobile views
$(document).ready(function () {
    table = $('#transactionTable').DataTable({
        "orderClasses": false,
        "pageLength": 15,
        "order": [],
        dom: 'Bfrtip',
        buttons: [
            'csv', 'excel', 'pdf'
        ],
        "columnDefs": [
            { "targets": [0, 1, 2, 7], "visible": false } // Hide Year, Month, Formatted Month, Transaction Key
        ],
        "stripeClasses": [],
        "createdRow": function (row, data, index) {
            $(row).addClass('custom-row-class');

            // Find the cell containing the new Subcategory dropdown
            var subcategoryCell = $(row).find('td.subcategory-dropdown');

            // Find the button and dropdown elements
            var reCategorizeButton = $(row).find('.re-categorize-button');
            var subcategoryDropdown = $(row).find('.subcategory-dropdown');

            // Add click event listener to the "Re-categorize" button
            reCategorizeButton.on('click', function () {
                // Toggle the visibility of the dropdown
                subcategoryDropdown.toggle();

                // Hide the "Re-categorize" button after it's pressed
                reCategorizeButton.hide();

                // Check if the dropdown is visible
                if (subcategoryDropdown.is(':visible')) {
                    // Load subcategories only when the dropdown becomes visible
                    $.ajax({
                        url: '/getDistinctSubcategories',
                        method: 'GET',
                        success: function (response) {
                            // Populate the dropdown with subcategories using Select2
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

                            subcategorySelect.on('select2:open', function (e) {
                                $('.select2-dropdown--below').addClass('dark-theme');
                            });

                            // Add custom styles to the head of the document
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

                            // Add change event listener to the Select2 dropdown
                            subcategorySelect.on('select2:select', function (e) {
                                // Get the updated Subcategory value
                                var updatedSubcategory = e.params.data.text;

                                // Add additional data you may need for the update
                                var rowData = table.row($(row)).data();
                                var transactionId = rowData[7];

                                // Trigger AJAX request to updateSubcategory endpoint
                                $.ajax({
                                    url: '/updateSubcategory',
                                    method: 'POST',
                                    data: {
                                        transactionId: transactionId,
                                        updatedSubcategory: updatedSubcategory
                                    },
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
                                                close: function (event, ui) {
                                                    $(this).remove();
                                                }
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

    // Event listener for Re-categorize button in mobile view
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
                            data: {
                                transactionId: transactionId,
                                updatedSubcategory: updatedSubcategory
                            },
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
    
    
    



    // Trigger aggregateData with the default option on page load
    aggregateData(window.appState.transaction_data, selectedOption);

    function aggregateData(transaction_data, selectedOption) {
    // Initialize an object to store aggregated data
		var aggregatedData = {};

		// Iterate over the transaction_data array
		for (var i = 0; i < transaction_data.length; i++) {
			// Extract relevant fields from each transaction
			var selectedField = transaction_data[i][getIndexForSelectedOption(selectedOption)];
			var transactionAmount = parseFloat(transaction_data[i][8]); // Get the amount as a float

			// Create a unique key based on the selectedField
			var key = selectedField;

			// Check if the key already exists in the aggregatedData object
			if (aggregatedData[key]) {
				// If it exists, update the aggregated values
				aggregatedData[key].count += 1;
				aggregatedData[key].totalAmount += isNaN(transactionAmount) ? 0 : transactionAmount;
			} else {
				// If it doesn't exist, initialize a new entry
				aggregatedData[key] = {
					count: 1,
					totalAmount: isNaN(transactionAmount) ? 0 : transactionAmount
				};
			}
		}

		// Apply Math.abs() after aggregation
		for (var key in aggregatedData) {
			if (aggregatedData.hasOwnProperty(key)) {
				aggregatedData[key].totalAmount = Math.round(Math.abs(aggregatedData[key].totalAmount));
			}
		}

		// Log or use the aggregatedData object as needed
		console.log("My aggregated data is ", aggregatedData);
		updateChart(aggregatedData);
	}


    // Helper function to get the index based on selected option
    function getIndexForSelectedOption(selectedOption) {
        switch (selectedOption) {
            case "Year":
                return 0; // Assuming Year is at index 0 in your data structure
            case "Month":
                return 1; // Assuming Month is at index 1
            case "FormattedMonth":
                return 2; // Assuming FormattedMonth is at index 2
            case "Payee":
                return 5; // Assuming Payee is at index 5
            case "Subcategory":
                return 6; // Assuming Subcategory is at index 6
            default:
                return 6; // Default to Subcategory if selectedOption is not recognized
        }
    }

    // Function to update the chart with the aggregated data
    function updateChart(aggregatedData) {
        var excludedCategories = ["Money Transfer", "Paycheck", "Interest Income", "CC Payment", "Transfer", "Credit Card Payment","Transfer"];
        var filteredData = Object.entries(aggregatedData)
            .filter(([category, data]) => !excludedCategories.includes(category))
            .reduce((obj, [category, data]) => {
                obj[category] = data.totalAmount;
                return obj;
            }, {});
    
        // Extract categories and values needed for the chart
        var categories = Object.keys(filteredData);
        var totalAmounts = Object.values(filteredData);
    
        // Process filteredData object
        for (var i = 0; i < categories.length; i++) {
            var category = categories[i];
            if (isNaN(filteredData[category])) {
                console.error("NaN value found in totalAmount for category:", category, filteredData[category]);
                filteredData[category] = 0;
            }
        }
    
        // Generate an array of unique colors for each category
        var categoryColors = generateCategoryColors(categories.length);
    
        // Use C3.js to generate the chart with different colors for each bar
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
                    font: {
                        weight: 'bold',
                        size: 10
                    },

                }
            },
            axis: {
                x: {
                    type: 'category',
                    label: {
                        text: 'Category',
                        position: 'outer-center',
                        color: '#E0E0E0',
                        font: {
                            weight: 'bold',
                            size: 10
                        },
                    }
                },
                y: {
                    label: {
                        text: 'Expense Amount',
                        position: 'outer-middle',
                        color: '#E0E0E0',
                        font: {
                            weight: 'bold',
                            size: 10
                        },
                    },
                    tick: {
                        format: function (value) {
                            return '$' + Math.round(value);
                        }
                    }
                }
            },
            grid: {
                y: {
                    lines: [{ value: 0 }]
                }
            },
            title: {
                text: 'Expense Trend',
                color: '#E0E0E0',
                font: '16px bold sans-serif',
                padding: {
                    top: 10,
                    bottom: 20
                },
                font: {
                    weight: 'bold',
                    size: 10
                },
            }
        });
    
        // Ensure axis labels are styled
        d3.selectAll('#bar_chart .c3-axis-x-label, #bar_chart .c3-axis-y-label')
            .style('fill', '#E0E0E0');
    
        // Manually set the title color using D3.js to ensure it applies
        d3.select('#bar_chart .c3-title')
            .style('fill', '#E0E0E0');
    }


    // Function to generate an array of unique colors for each category
    function generateCategoryColors(numCategories) {
        var colors = [];
        for (var i = 0; i < numCategories; i++) {
            // Generate a random color code (you can customize this logic)
            var color = '#' + Math.floor(Math.random() * 16777215).toString(16);
            colors.push(color);
        }
        return colors;
    }








    // Add change event listener to the dropdown for triggering aggregation
    $('#dropdown_select').on('change', function () {
        var selectedOption = $(this).val();
        aggregateData(window.appState.transaction_data, selectedOption);
    });

});


$(function () {
    var lastMonthStart = moment().subtract(1, 'month').startOf('month');
    var lastMonthEnd = moment().subtract(1, 'month').endOf('month');
    var currentMonthStart = moment().startOf('month');
    var currentMonthEnd = moment().endOf('month');
    $('#date_range').daterangepicker({
        startDate: currentMonthStart,
        endDate: currentMonthEnd,
        locale: {
            cancelLabel: 'Clear'
        },
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
        // Update hidden fields with start and end dates
        $('#start_date').val(picker.startDate.format('MM/DD/YYYY'));
        $('#end_date').val(picker.endDate.format('MM/DD/YYYY'));

        // Submit only the date range form
        if (!picker.startDate.isSame(picker.endDate)) {
            $(this).val(picker.startDate.format('MM/DD/YYYY') + ' - ' + picker.endDate.format('MM/DD/YYYY'));
            $('#dateRangeForm').submit(); // Submit the specific form
        } else {
            $('#date_range').removeAttr('name');
        }
    });

    $('#date_range').on('cancel.daterangepicker', function (ev, picker) {
        $(this).val('');
        $('#start_date').val('');
        $('#end_date').val('');
        $('#date_range').removeAttr('name');
    });
});




$(document).ready(function () {
    // Function to fetch line chart data
    function fetchLineChartData() {
        $.ajax({
            url: '/salary_chart_data',
            method: 'GET',
            success: function (lineChartData) {
                // Call a function to render the line chart using lineChartData
                renderLineChart(lineChartData);
            },
            error: function (error) {
                console.error('Error fetching line chart data:', error);
            }
        });
    }

    // Function to render the line chart
    function renderLineChart(lineChartData) {
        const dates = lineChartData.map(entry => entry[0]);
        const salaries = lineChartData.map(entry => entry[1]);
    
        const ctx = document.getElementById('lineChartCanvas').getContext('2d');
    
        const myLineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Salary',
                    data: salaries,
                    borderColor: '#FFD700', // Light gold color
                    fill: false,
                    datalabels: {
                        color: 'white',
                        align: 'top',
                        font: {
                            weight: 'bold',
                            size: 10
                        },
                        formatter: function(value, context) {
                            // Round the value to the nearest integer and add the $ symbol
                            return '$' + Math.round(value);
                        }
                    }
                }]
            },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                scales: {
                    x: {
                        ticks: {
                            color: 'white',
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'white',
                            callback: function(value, index, values) {
                                return '$' + Math.round(value);
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                        },
                        title: {
                            display: true,
                            text: 'Salary',
                            color: 'white',
                        },
                        min: 5000
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Salary Trend', // Add the title here
                        color: 'white', // Match the color theme
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: 'rgba(255, 255, 255, 1)',
                        }
                    },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        color: 'white',
                        font: {
                            weight: 'bold',
                            size: 10
                        },
                        formatter: function(value, context) {
                            return '$' + Math.round(value);
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    
        console.log("lineChart:", myLineChart);
    }





    // Fetch line chart data on page load
    fetchLineChartData();
});







//JS Code for Add Transaction

$(document).ready(function () {
    // Show the popup and set today's date as the default value
    $('#addTransactionButton').on('click', function () {
        const today = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
        $('#transactionDateInput').val(today); // Set the default value
        $('#addTransactionPopup').fadeIn();
    });

    // Close the popup when clicking the close button or cancel button
    $('#closeTransactionPopupButton, #cancelTransactionButton').on('click', function () {
        $('#addTransactionPopup').fadeOut();
    });

    // Close the popup when clicking outside the form
    $('#addTransactionPopup').on('click', function (e) {
        if ($(e.target).is('#addTransactionPopup')) {
            $('#addTransactionPopup').fadeOut();
        }
    });
});


$(document).ready(function () {
   
    $('#subcategorySelectInput').select2({
        ajax: {
            url: '/getDistinctSubcategories', // Backend endpoint to fetch subcategories
            dataType: 'json',
            processResults: function (data) {
                return {
                    results: data.map(subcategory => ({
                        id: subcategory,
                        text: subcategory
                    }))
                };
            }
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
    // Fetch all accounts once and store them locally
    let accountData = [];

    $.ajax({
        url: '/getAccounts', // Backend endpoint to fetch all accounts
        dataType: 'json',
        success: function (data) {
            accountData = data; // Store the fetched data locally

            // Initialize select2 for Account dropdown with client-side filtering
            $('#accountSelectInput').select2({
                data: accountData, // Use the locally stored data
                placeholder: 'Select an account',
                allowClear: true,
                matcher: function (params, data) {
                    // Custom matcher for filtering
                    if ($.trim(params.term) === '') {
                        return data;
                    }

                    if (data.text.toLowerCase().includes(params.term.toLowerCase())) {
                        return data;
                    }

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
    // Fetch all subcategories once and store them locally
    let subcategoryData = [];

    $.ajax({
        url: '/getDistinctSubcategories', // Backend endpoint to fetch all subcategories
        dataType: 'json',
        success: function (data) {
            subcategoryData = data.map(subcategory => ({
                id: subcategory,
                text: subcategory
            })); // Format the data for select2

            // Initialize select2 for Subcategory dropdown with client-side filtering
            $('#subcategorySelectInput').select2({
                data: subcategoryData, // Use the locally stored data
                placeholder: 'Select a subcategory',
                allowClear: true,
                matcher: function (params, data) {
                    // Custom matcher for filtering
                    if ($.trim(params.term) === '') {
                        return data;
                    }

                    if (data.text.toLowerCase().includes(params.term.toLowerCase())) {
                        return data;
                    }

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
    // Pre-load subcategories for the Split Transaction dropdown
    let splitSubcategoryData = [];

    // Fetch subcategories once and store them
    $.ajax({
        url: '/getDistinctSubcategories',
        method: 'GET',
        dataType: 'json',
        success: function (data) {
            splitSubcategoryData = data.map(subcategory => ({
                id: subcategory,
                text: subcategory
            }));
            // Initialize Select2 after data is loaded
            $('#splitTransactionSubcategorySelect').select2({
                data: splitSubcategoryData,
                placeholder: 'Select a subcategory',
                allowClear: true,
                matcher: function (params, data) {
                    // Custom matcher for filtering
                    if ($.trim(params.term) === '') {
                        return data;
                    }
                    if (data.text.toLowerCase().includes(params.term.toLowerCase())) {
                        return data;
                    }
                    return null;
                }
            });
        },
        error: function (error) {
            console.error('Error fetching subcategories for split transaction:', error);
        }
    });

    // Show the Split Transaction popup
    $('#transactionTable').on('click', '.split-button', function () {
        const row = $(this).closest('tr');
        const rowData = table.row(row).data();
        const transactionKey = rowData[7];
        const transactionAmount = parseFloat(row.find('td:nth-child(9)').text().replace(/[^0-9.-]+/g, ""));

        // Store transaction details in the popup for later use
        $('#splitTransactionPopup').data('transactionKey', transactionKey);
        $('#splitTransactionPopup').data('transactionAmount', transactionAmount);

        // Show the popup
        $('#splitTransactionPopup').fadeIn();
    });

    // Close the popup when clicking the close button or cancel button
    $('#splitTransactionCloseButton, #splitTransactionCancelButton').on('click', function () {
        $('#splitTransactionPopup').fadeOut();
    });

    // Close the popup when clicking outside the form
    $('#splitTransactionPopup').on('click', function (e) {
        if ($(e.target).is('#splitTransactionPopup')) {
            $('#splitTransactionPopup').fadeOut();
        }
    });

    // Handle Split Transaction form submission
    $('#splitTransactionForm').on('submit', function (e) {
        e.preventDefault();
    
        const transactionKey = $('#splitTransactionPopup').data('transactionKey');
        const transactionAmount = $('#splitTransactionPopup').data('transactionAmount');
        const splitAmountInput = $('#splitTransactionAmountInput').val().trim();
        const splitAmount = parseFloat(splitAmountInput);
        const subcategory = $('#splitTransactionSubcategorySelect').val();
    
        // Enhanced validation
        if (!splitAmountInput || isNaN(splitAmount) || splitAmount <= 0 || Math.abs(splitAmount) >= Math.abs(transactionAmount)) {
            alert("Invalid amount! Please enter a number between 0 and " + Math.abs(transactionAmount));
            return;
        }
    
        if (!subcategory) {
            alert("Please select a subcategory!");
            return;
        }
    
        // Ensure the split amount keeps the same sign as the original transaction
        const adjustedSplitAmount = transactionAmount < 0 ? -Math.abs(splitAmount) : Math.abs(splitAmount);
    
        // Send the split transaction to the backend
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
    
        // Close the popup
        $('#splitTransactionPopup').fadeOut();
    });
});