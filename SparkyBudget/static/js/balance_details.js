$(document).ready(function () {
    // Initialize DataTable with custom styling
    if (!$.fn.dataTable.isDataTable('#balanceTable')) {
        $('#balanceTable').DataTable({
            "pageLength": 17,
            "lengthMenu": [
                [10, 17, 25, -1],
                [10, 17, 25, "All"]
            ],
            "rowCallback": function (row, data) {
                // Add the dark-row class to each row
                $(row).addClass('dark-row');
            },
            "autoWidth": false, // Disable automatic column width calculation
            "stripeClasses": [], // Disable color banding
            "columns": [
                null, // Bank
                null, // Account Name
                null, // As of
                null, // Balance
                null  // Available Balance
            ]
        });
    }
});