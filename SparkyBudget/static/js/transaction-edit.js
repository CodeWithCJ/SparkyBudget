var table; // Define the table variable globally
var selectedOption = "Subcategory";




$(document).ready(function () {
    table = $('#transactionTable').DataTable({
        // ... (your existing DataTable configuration)

        "orderClasses": false,
        "pageLength": 15,
        "order": [],
        dom: 'Bfrtip',
        buttons: [
            'csv', 'excel', 'pdf'
        ],
        "columnDefs": [
            { "targets": [0, 1, 2, 7], "visible": false }
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
                                width: '200px'// Set the width to a specific value (e.g., 200 pixels)

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
                                        // Add any other necessary data for the update
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
    
    // TODO: this guy breaks excel export as there's no header columns. Do we really need this?
    // // Add individual column filters
    // $('#transactionTable thead th').each(function (index) {
    //     var title = $(this).text();

    //     $(this).html('<input type="text" placeholder="Search ' + title + '" />');
    // });

    // Apply the individual column filters
    table.columns().every(function () {
        var that = this;

        // Check if the input is not focused to prevent sorting
        var isInputFocused = false;

        $('input', this.header())
            .on('focus', function () {
                isInputFocused = true;
            })
            .on('blur', function () {
                isInputFocused = false;
            })
            .on('keyup change', function (e) {
                // Prevent sorting when the input field is focused
                if (isInputFocused && e.type === 'keyup' && e.key !== 'Enter') {
                    return;
                }

                if (that.search() !== this.value) {
                    that
                        .search(this.value)
                        .draw();
                }
            });
    });



    // Trigger aggregateData with the default option on page load
    aggregateData(window.appState.transaction_data, selectedOption);

    function aggregateData(transaction_data, selectedOption) {
        // Initialize an object to store aggregated data
        var aggregatedData = {};

        // Iterate over the transaction_data array
        for (var i = 0; i < transaction_data.length; i++) {
            // Extract relevant fields from each transaction
            var selectedField = transaction_data[i][getIndexForSelectedOption(selectedOption)];
            var transactionAmount = Math.round(Math.abs(parseFloat(transaction_data[i][8])));


            // Create a unique key based on the desired field (e.g., selectedField)
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
            // Check for NaN values
            if (isNaN(aggregatedData[key].totalAmount)) {
                console.log('NaN value detected for key:', key);
                console.log('Transaction data:', transaction_data[i]);
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
        var excludedCategories = ["Money Transfer", "Paycheck", "Interest Income", "CC Payment", "Transfer", "Credit Card Payment"];
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

            // Check for NaN values in totalAmount field and replace them with 0
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
                x: 'Category', // x-axis data will be stored under 'Category' in the columns array
                columns: [
                    // Use 'Category' as the label for the x-axis
                    ['Category'].concat(categories),
                    ['Total Amount'].concat(totalAmounts)
                ],
                type: 'bar',
                color: function (color, d) {
                    return categoryColors[d.index % categoryColors.length]; // Assign color based on category index
                },
                labels: {
                    format: function (v, id, i, j) {
                        return v; // Display the data value as the label
                    },
                    color: 'white' // Set the label color to white
                }
            },
            axis: {
                x: {
                    type: 'category', // Specify that x-axis should be treated as a category
                    label: {
                        text: 'Category', // Use 'Category' as the x-axis label
                        position: 'outer-center',
                        color: 'white' // Set x-axis label color to white
                    }
                },
                y: {
                    label: {
                        text: 'Total Amount', // Y-axis label
                        position: 'outer-middle',
                        color: 'white' // Set y-axis label color to white
                    }
                }
            },
            grid: {
                y: {
                    lines: [{ value: 0 }] // Add a horizontal line at y = 0 for better visibility on a dark background
                }
            },
            // Your other chart configurations...
        });

        d3.selectAll('#bar_chart .c3-axis-x-label, #bar_chart .c3-axis-y-label')
            .style('fill', 'white');
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
        // Separate start and end dates and set them as separate input values
        $('#start_date').val(picker.startDate.format('MM/DD/YYYY'));
        $('#end_date').val(picker.endDate.format('MM/DD/YYYY'));


        // Remove the date_range parameter if it's empty
        if (!picker.startDate.isSame(picker.endDate)) {
            $(this).val(picker.startDate.format('MM/DD/YYYY') + ' - ' + picker.endDate.format('MM/DD/YYYY'));
            $('form').submit();

        } else {
            $('#date_range').removeAttr('name');
        }
    });

    $('#date_range').on('cancel.daterangepicker', function (ev, picker) {
        $(this).val('');
        $('#start_date').val('');
        $('#end_date').val('');
        // Remove the date_range parameter when canceled
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
                    borderColor: 'rgba(75, 192, 192, 1)',
                    fill: false,
                }]
            },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                scales: {
                    x: {
                        ticks: {
                            color: 'white', // X-axis tick color
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)', // X-axis grid color
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'white', // Y-axis tick color
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)', // Y-axis grid color
                        },
                        title: {
                            display: true,
                            text: 'Salary',
                            color: 'white', // Y-axis title color
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: 'rgba(255, 255, 255, 1)',
                        }
                    }
                }
            }
        });


        console.log("lineChart:", myLineChart);
    }




    // Fetch line chart data on page load
    fetchLineChartData();
});
