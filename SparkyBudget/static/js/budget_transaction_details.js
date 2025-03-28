// budget_transaction_details.js
$(document).ready(function() {
    // Attach the showSubcategoryDropdown function to the "Re-categorize" button
    $('.reCategorizeButton').on('click', function () {
        showSubcategoryDropdown(this);
    });
});

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

var previousSubcategory = '';
// Function to update the subcategory in the database
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
                // Note: Removed updateBudgetSummaryChart and showTransactionDetails calls
                // as they weren't in your original table-specific code
            },
            error: function (error) {
                console.error('Error updating subcategory:', error);
            }
        });
    } else {
        alert('Please select a subcategory before updating.');
    }
}

