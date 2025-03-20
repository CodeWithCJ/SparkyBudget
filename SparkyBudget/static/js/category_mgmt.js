$(document).ready(function () {
    var table = $('#categoryTable').DataTable({
        "ajax": {
            "url": "/getCategorySubCategory",
            "dataSrc": "data"  // Adjusted to correctly point to the data key in the JSON response
        },
        "orderClasses": false,
        "pageLength": 15,
        "columnDefs": [
            {
                "targets": [1], // The index of the SubCategoryKey column you want to hide
                "visible": false, // Set visibility to false
                "searchable": false
            }
        ],
        "order": [[2, 'asc'], [3, 'asc']],
        "columns": [
            {
                "data": "SubCategoryKey",
                "render": function (data, type, row) {
                    return '<button class="delete-btn" onclick="deleteSubCategory(' + data + ')"><i class="fas fa-trash-alt"></i></button>';
                }
            },
            { "data": "SubCategoryKey" },
            { "data": "Category" },
            {
                "data": "SubCategory",
                "render": function (data, type, row) {
                    if (type === 'display') {
                        return '<input type="text" value="' + data + '" onBlur="updateSubCategory(' + row.SubCategoryKey + ', this.value)">';
                    }
                    return data;
                }
            }
        ]
    });

    var table1 = $('#categoryRuleTable').DataTable({
        "ajax": {
            "url": "/getSubCategoryRules",
            "dataSrc": "data"
        },
        "orderClasses": false,
        "pageLength": 15,
        "columnDefs": [
            {
                "targets": [1],
                "visible": false,
                "searchable": false
            }
        ],
        "order": [[1, 'asc'], [2, 'asc'], [3, 'asc'], [4, 'asc']],
        "columns": [
            {
                "data": "RuleKey",
                "render": function (data, type, row) {
                    return '<button class="delete-btn" onclick="deleteRule(' + data + ')"><i class="fas fa-trash-alt"></i></button>';
                }
            },
            { "data": "RuleKey" },
            { "data": "Default_SubCategory" },
            { "data": "Rule_Category" },
            { "data": "Rule_Pattern" },
            {
                "data": "Match_Word",
                "render": function (data, type, row) {
                    if (type === 'display') {
                        return '<input type="text" value="' + data + '" onBlur="updateRule(' + row.RuleKey + ', this.value)">';
                    }
                    return data;
                }
            }
        ]
    });

    $.get('/getCategory', function (categories) {
        // Clear existing options
        const formattedCategories = categories.map(x => ({
            id: x.Category,
            text: x.Category
        }));
        $('#category').empty();
        // Populate the Select2 dropdown with fetched subcategories
        $('#category').select2({
            data: formattedCategories,
            width: '180px',
            placeholder: 'Select or type to search',
            allowClear: true,
        });
    });

    $('#addCategoryForm').on('submit', function (e) {
        e.preventDefault();
        $.ajax({
            url: '/addSubCategory',
            type: 'POST',
            data: $(this).serialize(),
            success: function (response) {
                // Check if the response indicates success
                if (response.success) {
                    // Show an alert message
                    alert(response.message); // "Category added successfully"
                    // Reload the page
                    window.location.reload();
                } else {
                    // Handle the case where the operation wasn't successful
                    alert("Failed to add category: " + response.message);
                }
            },
            error: function (xhr, status, error) {
                // Handle possible AJAX errors
                alert("An error occurred: " + error);
            }
        });
    });

    $.get('/getSubCategory', function (subcategories) {
        // Clear existing options
        const formattedSubCategories = subcategories.map(x => ({
            id: x.SubCategory,
            text: x.SubCategory
        }));
        $('#subcategoryDropDown').empty();
        // Populate the Select2 dropdown with fetched subcategories
        $('#subcategoryDropDown').select2({
            data: formattedSubCategories,
            width: '180px',
            placeholder: 'Select or type to search',
            allowClear: true,
        });
    });

    // New function for adding Subcategory Rule
    $('#submitAddSubCategoryRule').on('click', function (e) {
        e.preventDefault();
        $.ajax({
            url: '/addSubCategoryRule',  // Change the endpoint for subcategory rule
            type: 'POST',
            data: $('#addSubCategoryRuleForm').serialize(),  // Serialize the form data
            success: function (response) {
                if (response.success) {
                    alert(response.message); // "Rule added successfully"
                    window.location.reload();  // Reload the page
                } else {
                    alert("Failed to add rule: " + response.message);
                }
            },
            error: function (xhr, status, error) {
                alert("An error occurred: " + error);
            }
        });
    });
});

function deleteSubCategory(subCategoryKey) {
    $.ajax({
        url: '/deleteSubCategory/' + subCategoryKey,
        type: 'DELETE',
        success: function (result) {
            $('#categoryTable').DataTable().ajax.reload();
        }
    });
}

function updateSubCategory(subCategoryKey, newSubCategoryName) {
    $.ajax({
        url: '/updateSubCategoryDIM',
        type: 'POST',
        data: {
            subcategory_key: subCategoryKey,
            new_subcategory_name: newSubCategoryName
        },
        success: function (response) {
            $('#categoryTable').DataTable().ajax.reload();
        }
    });
}

function updateRule(RuleKey, Match_Word) {
    $.ajax({
        url: '/updateRule',
        type: 'POST',
        data: {
            RuleKey: RuleKey,
            Match_Word: Match_Word
        },
        success: function (response) {
            $('#categoryTable').DataTable().ajax.reload();
        }
    });
}

function deleteRule(RuleKey) {
    $.ajax({
        url: '/deleteRule/' + RuleKey,
        type: 'DELETE',
        success: function (result) {
            $('#categoryRuleTable').DataTable().ajax.reload();
        }
    });
}

$(document).ready(function() {
    // Initialize DataTable for AccountTypes
    var accountTypeTable = $('#accountTypeTable').DataTable({
        "ajax": {
            "url": "/getAccountTypes",
            "dataSrc": "data",
            "error": function(xhr, error, thrown) {
                console.error("Error fetching account types:", error, thrown);
                alert("Failed to load account types. Please check the server.");
            }
        },
        "orderClasses": false,
        "pageLength": 15,
        "order": [[1, 'asc']],
        "columns": [
            {
                "data": null,
                "render": function(data, type, row) {
                    if (type === 'display' && row.AccountType !== '') { // Existing row
                        return '<button class="delete-btn"><i class="fas fa-trash-alt"></i></button>';
                    }
                    return ''; // No delete button for the new row
                }
            },
            {
                "data": "AccountType",
                "render": function(data, type, row) {
                    if (type === 'display' && row.AccountType !== '') { // Existing row
                        return '<input type="text" class="account-type-input" data-old-value="' + row.AccountType + '" value="' + data + '">';
                    }
                    return data; // For the new row, handled by addNewRow
                }
            },
            {
                "data": "HideFromBudget",
                "render": function(data, type, row) {
                    if (type === 'display' && row.AccountType !== '') { // Existing row
                        return '<input type="checkbox" class="hide-from-budget" ' + (data ? 'checked' : '') + '>';
                    }
                    return data ? '<input type="checkbox" checked>' : '<input type="checkbox">'; // New row placeholder
                }
            }
            
        ],
        "bSort": false, // Disable sorting from DataTables as we will handle it through Sortable.js
        "dom": 't' // Display only the table
    });

    // Function to add a single new row
    function addNewRow() {
        // Check if a new row already exists
        if (accountTypeTable.rows('.new-row').any()) {
            return; // Do nothing if a new row already exists
        }
        var newRow = accountTypeTable.row.add({           
            AccountType: '',
            HideFromBudget: false
        }).draw();
        var rowNode = accountTypeTable.row(newRow).node();
        $(rowNode).addClass('new-row');
        // Add input fields to the new row
        $(rowNode).find('td').each(function(index) {
            if (index === 1) {
                $(this).html('<input type="text" name="AccountType">');
            } else if (index === 2) {
                $(this).html('<input type="checkbox" class="hide-from-budget new-row-checkbox" name="HideFromBudget">');
            } else if (index === 0) {
                $(this).html(''); // Empty cell for the delete column
            }
        });
        // Focus on the first input field of the new row
        $(rowNode).find('input[type="text"]').focus();
    }

    // Add a single new row after the table is initialized
    accountTypeTable.on('init.dt', function() {
        addNewRow();
    });

    // Debounce mechanism to ensure addNewRow is called only once per draw cycle
    let isAddingNewRow = false;
    accountTypeTable.on('draw.dt', function() {
        if (!isAddingNewRow) {
            isAddingNewRow = true;
            // Remove any existing new-row classes to avoid duplicates
            $('.new-row').removeClass('new-row');
            addNewRow();
            isAddingNewRow = false;
        }
    });

    // Attach event listeners for existing rows
    $('#accountTypeTable').on('blur', '.account-type-input', function() {
        var $input = $(this);
        var newAccountType = $input.val();
        var oldAccountType = $input.data('old-value');
        var row = accountTypeTable.row($input.closest('tr')).data();
        var hideFromBudget = row.HideFromBudget;
        var sortOrder = row.SortOrder;
        if (newAccountType !== oldAccountType) {
            updateAccountType(oldAccountType, newAccountType, hideFromBudget, sortOrder);
        }
    });

    $('#accountTypeTable').on('change', '.hide-from-budget', function() {
        var $checkbox = $(this);
        var hideFromBudget = $checkbox.is(':checked');
        var row = accountTypeTable.row($checkbox.closest('tr')).data();
        var oldAccountType = row.AccountType;
        var newAccountType = row.AccountType; // Not changing AccountType in this case
        var sortOrder = row.SortOrder;
        updateAccountType(oldAccountType, newAccountType, hideFromBudget, sortOrder);
    });

    // Handle delete button clicks
    $('#accountTypeTable').on('click', '.delete-btn', function() {
        var $button = $(this);
        var row = accountTypeTable.row($button.closest('tr')).data();
        var accountType = row.AccountType;
        if (accountType && confirm("Are you sure you want to delete the account type: " + accountType + "?")) {
            deleteAccountType(accountType);
        }
    });

    // Handle sorting with Sortable.js
    var el = document.getElementById('accountTypeTable').getElementsByTagName('tbody')[0];
    sortable = Sortable.create(el, {
        animation: 150,
        ghostClass: 'ghost',
        chosenClass: 'dragging',
        onEnd: function (evt) {
            var oldIndex = evt.oldIndex;
            var newIndex = evt.newIndex;
            // Get the data, excluding the new row
            var data = accountTypeTable.data().toArray().filter(row => row.AccountType !== '');
            // Reorder the data
            var movedItem = data.splice(oldIndex, 1)[0];
            data.splice(newIndex, 0, movedItem);
            // Update SortOrder
            data.forEach(function(item, index) {
                item.SortOrder = index;
            });
            // Update the table (excluding the new row)
            accountTypeTable.clear().rows.add(data).draw();
            // Confirm the reorder
            if (confirm("Reorder the categories?")) {
                updateAccountTypes(data);
            } else {
                // Revert the order
                data.forEach(function(item, index) {
                    item.SortOrder = index;
                });
                accountTypeTable.clear().rows.add(data).draw();
            }
        }
    });

    // Function to save new account type
    function saveAccountType(data) {
        $.ajax({
            url: '/addAccountType',
            type: 'POST',
            data: JSON.stringify(data),
            contentType: 'application/json',
            success: function(response) {
                if (response.success) {
                    accountTypeTable.ajax.reload(null, false); // Reload table without resetting paging
                } else {
                    alert("Failed to add account type: " + response.message);
                }
            },
            error: function(xhr, status, error) {
                alert("An error occurred: " + error);
            }
        });
    }

    // Handle adding new account type
    $('#accountTypeTable').on('blur', '.new-row input[type="text"]', function() {
        var rowNode = $(this).closest('tr');
        var accountType = $(rowNode).find('input[type="text"]').val();
        var hideFromBudget = $(rowNode).find('input[type="checkbox"]').is(':checked');
        if (accountType) {
            // Save the new account type
            saveAccountType({
                AccountType: accountType,
                HideFromBudget: hideFromBudget,
                SortOrder: accountTypeTable.data().length
            });
            // Remove the new row
            accountTypeTable.row(rowNode).remove().draw();
        }
    });

    // Function to update account type
    function updateAccountType(oldAccountType, newAccountType, hideFromBudget, sortOrder) {
        $.ajax({
            url: '/updateAccountTypes',
            type: 'POST',
            data: JSON.stringify([{
                OldAccountType: oldAccountType, // Use original AccountType for WHERE clause
                AccountType: newAccountType,
                HideFromBudget: hideFromBudget ? 1 : 0,
                SortOrder: sortOrder
            }]),
            contentType: 'application/json',
            success: function(response) {
                if (response.success) {
                    accountTypeTable.ajax.reload(null, false); // Reload table without resetting paging
                } else {
                    alert("Failed to update account type: " + response.message);
                }
            },
            error: function(xhr, status, error) {
                alert("An error occurred: " + error);
            }
        });
    }

    // Function to delete account type
    function deleteAccountType(accountType) {
        $.ajax({
            url: '/deleteAccountType/' + accountType,
            type: 'DELETE',
            success: function(response) {
                if (response.success) {
                    accountTypeTable.ajax.reload(null, false); // Reload table without resetting paging
                } else {
                    alert("Failed to delete account type: " + response.message);
                }
            },
            error: function(xhr, status, error) {
                alert("An error occurred: " + error);
            }
        });
    }

    // Function to update account types (for sorting)
    function updateAccountTypes(data) {
        console.log("Sending data to updateAccountTypes:", data);
        $.ajax({
            url: '/updateAccountTypes',
            type: 'POST',
            data: JSON.stringify(data),
            contentType: 'application/json',
            success: function(response) {
                if (response.success) {
                    accountTypeTable.ajax.reload(null, false); // Reload table without resetting paging
                } else {
                    alert("Failed to update account types: " + response.message);
                }
            },
            error: function(xhr, status, error) {
                alert("An error occurred: " + error);
            }
        });
    }
});
