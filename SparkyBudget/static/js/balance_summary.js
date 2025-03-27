$(document).ready(function () {
    // Add click event for expanding/collapsing rows
    $('.type-row td').click(function () {
        var $parentRow = $(this).closest('tr');
        var $childRows = $parentRow.nextUntil(':not(.child-row)');

        if ($parentRow.hasClass('expanded')) {
            // Collapse child rows smoothly
            $childRows.each(function () {
                var $row = $(this);
                $row.css({
                    maxHeight: $row.outerHeight() + 'px',
                    opacity: 1
                }).animate({
                    maxHeight: 0,
                    opacity: 0
                }, 500, function () {
                    $row.hide(); // Hide after animation completes
                });
            });
        } else {
            // Expand child rows smoothly
            $childRows.each(function () {
                var $row = $(this);
                $row.show(); // Show immediately
                var height = $row.get(0).scrollHeight; // Get full height of the row
                $row.css({
                    maxHeight: 0,
                    opacity: 0
                }).animate({
                    maxHeight: height + 'px', // Animate to full height
                    opacity: 1
                }, 500);
            });
        }

        $parentRow.toggleClass('expanded');
    });




	

    // Create a bar chart
    const balanceChart = document.getElementById('balanceChart');
    if (balanceChart) {
        const ctx = balanceChart.getContext('2d');
        var myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: window.appState.labels,
                datasets: [{
                    label: 'Balance',
                    data: window.appState.balances,
                    backgroundColor: [
                        '#32A45F', // Color for the first account type
                        '#90EBFC', // Color for the second account type
                        '#846BFF',
                        '#FF8E5F',
                        // Add more colors as needed
                    ],
                    borderColor: 'white', // Adjust color as needed
                    borderWidth: 2
                }]
            },
            options: {
                indexAxis: 'y', // Set the index axis to 'y' for a vertical bar chart
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            color: 'white', // Set x-axis label color to white
                            fontSize: 14 // Set font size for x-axis labels
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'white', // Set y-axis label color to white
                            fontSize: 14 // Set font size for y-axis labels
                        }
                    }
                },
                maintainAspectRatio: false, // Make the chart responsive
                aspectRatio: 8, // Adjust this value to control the height of the chart
                plugins: {
                    legend: {
                        display: false,

                    },
                    datalabels: {

                        color: 'white', // Set the color of the datalabels
                        font: {
                            size: 14 // Set the font size of the datalabels
                        },
                        anchor: 'end',
                        align: 'end'


                    }
                }
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', function () {
    // Toggle the collapsed class on button click
    document.getElementById('toggleBalanceSummary').addEventListener('click', function () {
        document.querySelector('.balance-summary-container').classList.toggle('collapsed');
    });
});



$(document).ready(function () {
    // Toggle balance summary visibility and icon style
    $('#toggleBalanceSummary').on('click', function () {
        const $balanceSummary = $('.balance-summary-container');
        const $icon = $(this).find('i');
        $balanceSummary.toggle();       
    });

    // Update arrow icon when collapse is shown
    $('.account-type-header[data-toggle="collapse"]').on('show.bs.collapse', function () {
        console.log('Collapse is being shown for:', $(this).find('.account-name').text());
        const $icon = $(this).find('.expand-icon');
        $icon.text('▼');
    });

    // Update arrow icon when collapse is hidden
    $('.account-type-header[data-toggle="collapse"]').on('hide.bs.collapse', function () {
        console.log('Collapse is being hidden for:', $(this).find('.account-name').text());
        const $icon = $(this).find('.expand-icon');
        $icon.text('▶');
    });

    // Initialize arrows (all collapsed by default)
    $('.account-type-header[data-toggle="collapse"]').each(function () {
        $(this).find('.expand-icon').text('▶');
    });
});