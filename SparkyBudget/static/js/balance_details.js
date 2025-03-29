// static/js/balance_details.js

$(document).ready(function() {
    // Initialize DataTable with custom styling and debugging, only if not already initialized
    if (!$.fn.dataTable.isDataTable('#balanceTable')) {
        $('#balanceTable').DataTable({
            "pageLength": 17,
            "lengthMenu": [
                [10, 17, 25, -1],
                [10, 17, 25, "All"]
            ],
            "rowCallback": function(row, data) {
                // Add the dark-row class to each row
                $(row).addClass('dark-row');
            },
            "autoWidth": false,
            "stripeClasses": [],
            "deferRender": true,
            "initComplete": function(settings, json) {
                console.log('DataTables initialized with column count:', settings.aoColumns.length);
            },
            "columns": [
                null, // Account Type
                null, // Bank
                null, // Display Account Name
                null, // As of
                null, // Balance
                null  // Available Balance
            ]
        });
    }

    let accountTypes = [];
    $.ajax({
        url: '/get_account_types',
        method: 'GET',
        success: function(response) {
            if (response.success) {
                accountTypes = response.account_types;
            } else {
                console.error('Failed to fetch account types:', response.message);
            }
        },
        error: function(error) {
            console.error('Error fetching account types:', error);
        }
    });

    // Handle editable display name
    $(document).on('click', '.editable-display-name', function() {
        const $cell = $(this);
        const currentValue = $cell.text().trim() || '';
        const accountKey = $cell.data('account-key');

        $cell.html(`<input type="text" value="${currentValue}" class="display-name-input" />`);
        const $input = $cell.find('input');
        $input.focus();

        $input.on('blur keypress', function(e) {
            if (e.type === 'blur' || (e.type === 'keypress' && e.which === 13)) {
                const newValue = $input.val().trim();
                $cell.html(newValue || ''); // Display empty string in UI if cleared

                $.ajax({
                    url: '/update_display_account_name',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        account_key: accountKey,
                        display_account_name: newValue
                    }),
                    success: function(response) {
                        if (response.success) {
                            console.log('DisplayAccountName updated successfully');
                            // Refresh the page to pull updated data
                            location.reload();
                        } else {
                            console.error('Failed to update DisplayAccountName:', response.message);
                            $cell.html(currentValue);
                        }
                    },
                    error: function(xhr, status, error) {
                        let errorMessage = xhr.responseJSON ? xhr.responseJSON.message : 'Unknown error';
                        console.error('Error updating DisplayAccountName:', status, error, errorMessage);
                        $cell.html(currentValue);
                    }
                });
            }
        });
    });

    // Handle editable account type
    $(document).on('click', '.editable-account-type', function(e) {
        const $cell = $(this);
        const currentValue = $cell.text().trim() || '';
        const accountKey = $cell.data('account-key');

        // Only create dropdown if cell doesn't already contain a select
        if (!$cell.find('select').length) {
            let dropdownHtml = '<select class="account-type-select">';
            accountTypes.forEach(type => {
                dropdownHtml += `<option value="${type.key}" ${type.type === currentValue ? 'selected' : ''}>${type.type}</option>`;
            });
            dropdownHtml += '</select>';
            $cell.html(dropdownHtml);

            const $select = $cell.find('select');
            $select.focus();

            // Handle selection change
            $select.on('change', function() {
                const newKey = $select.val();
                const newType = $select.find('option:selected').text();
                $cell.html(newType); // Update cell with selected value

                // AJAX call to update the account type
                $.ajax({
                    url: '/update_account_type',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        account_key: accountKey,
                        account_type_key: newKey
                    }),
                    success: function(response) {
                        if (response.success) {
                            console.log('AccountType updated successfully');
                            location.reload();
                        } else {
                            console.error('Failed to update AccountType:', response.message);
                            $cell.html(currentValue);
                        }
                    },
                    error: function(error) {
                        console.error('Error updating AccountType:', error);
                        $cell.html(currentValue);
                    }
                });
            });

            // Handle click outside to revert if no selection made
            $(document).one('click', function closeDropdown(event) {
                if (!$(event.target).closest('.editable-account-type').length) {
                    $cell.html(currentValue); // Revert to original value
                    $(document).off('click', closeDropdown); // Remove the listener
                }
            });
        }

        // Prevent default click behavior if needed
        e.stopPropagation();
    });
});