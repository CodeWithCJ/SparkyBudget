$(document).ready(function () {
    // Add click event for expanding/collapsing rows
    $('.type-row td').click(function () {
        var parentRow = $(this).closest('tr');
        parentRow.nextUntil(':not(.child-row)').toggle();
        parentRow.toggleClass('expanded');
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