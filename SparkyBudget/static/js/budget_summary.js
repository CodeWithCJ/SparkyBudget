var editedRow; // Declare editedRow at a higher scope

$(document).ready(function () {
    var table = $('#budgetsummaryTable').DataTable({
        "pageLength": 10,
        "lengthMenu": [
            [5, 10, 25, -1],
            [5, 10, 25, "All"]
        ],
        "autoWidth": false,
        "columns": [
            null, // Category
            null, // Sub Category
            { "orderable": false, "className": "editButton" }, // Budget (make it non-orderable and add a class)
            null, // Spent
            null // Balance
        ]
    });

    $('#budgetsummaryTable tbody').on('click', 'button.editButton', function () {
        var index = $(this).data('index');
        console.log('Edit button clicked for index:', index);
        enableInlineEdit(index);
    });

    $(document).on('click', function (e) {
        if (!$(e.target).closest('.editable').length && editedRow !== undefined) {
            console.log('Click outside editable area, updating budget for index:', editedRow);
            updateBudget(editedRow);
        }
    });

    $('#budgetsummaryTable tbody').on('click', 'td.editable', function () {
        var index = $(this).closest('tr').index();
        console.log('Editable cell clicked, enabling inline edit for index:', index);
        enableInlineEdit(index);
    });

    function enableInlineEdit(index) {
        console.log('Enabling inline edit for index:', index);
        var row = $('#budgetsummaryTable').DataTable().row(index).nodes().to$();
        var budgetValue = row.find('.budgetValue').text();

        // Hide the span and show the input field
        row.find('.budgetValue').hide();
        row.find('.editInput').show().val(budgetValue).focus();

        // Store the edited row information in a data attribute
        editedRow = index;
        row.data('editedRow', index);
        console.log('New value is', editedRow);
    }

    function updateBudget(index) {
        var row = $('#budgetsummaryTable').DataTable().row(index).nodes().to$();
        var editedValue = row.find('.editInput').val();

        var selectedYear = '2023';//$('#transactionYear').val();
        var selectedMonth = '12'; //$('#monthButtons .active').data('month');
        var selectedSubcategory = row.find('td:eq(1)').text();
        console.log('data written are ', selectedYear, selectedMonth, selectedSubcategory, editedValue);

        $.ajax({
            url: '/inline_edit_budget',  // Change the URL to match your Flask route
            type: 'POST',
            contentType: 'application/json',  // Add this line to specify JSON content type
            data: JSON.stringify({
                year: selectedYear,  // Make sure this variable is defined
                month: selectedMonth,
                subcategory: selectedSubcategory,
                budget: editedValue
            }),
            success: function (data, textStatus, jqXHR) {
                console.log('Budget updated successfully:', data);
                row.find('.budgetValue').text(editedValue);
                disableInlineEdit(row);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error('Error updating budget:', textStatus);
            }
        });
    }

    function disableInlineEdit(row) {
        row.find('.budgetValue').show();
        row.find('.editInput').hide();
        // Clear the edited row information
        row.data('editedRow', null);
        editedRow = undefined; // Reset editedRow
    }
});