$(document).ready(function() {
    // Initialize DataTable with custom styling and debugging
    if (!$.fn.dataTable.isDataTable('#balanceTable')) {
        $('#balanceTable').DataTable({
            "pageLength": 17,
            "lengthMenu": [
                [10, 17, 25, -1],
                [10, 17, 25, "All"]
            ],
            "rowCallback": function(row, data) {
                $(row).addClass('dark-row');
            },
            "autoWidth": false,
            "stripeClasses": [],
            "deferRender": true,
            "initComplete": function(settings, json) {
                console.log('DataTables initialized with column count:', settings.aoColumns.length);
            },
            "columns": [
                { "visible": false }, // Hidden AccountKey column
                null, // Account Type
                null, // Bank
                null, // Display Account Name
                null, // Last Sync
                null, // Balance                
                null, // Available Balance
                { "orderable": false } // Upload column (non-sortable)
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
                $cell.html(newValue || '');

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

        if (!$cell.find('select').length) {
            let dropdownHtml = '<select class="account-type-select">';
            accountTypes.forEach(type => {
                dropdownHtml += `<option value="${type.key}" ${type.type === currentValue ? 'selected' : ''}>${type.type}</option>`;
            });
            dropdownHtml += '</select>';
            $cell.html(dropdownHtml);

            const $select = $cell.find('select');
            $select.focus();

            $select.on('change', function() {
                const newKey = $select.val();
                const newType = $select.find('option:selected').text();
                $cell.html(newType);

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

            $(document).one('click', function closeDropdown(event) {
                if (!$(event.target).closest('.editable-account-type').length) {
                    $cell.html(currentValue);
                    $(document).off('click', closeDropdown);
                }
            });
        }

        e.stopPropagation();
    });

    // Handle upload icon click
    $(document).on('click', '.upload-icon', function() {
        const $icon = $(this);
        const accountKey = $icon.data('account-key');
        const $fileInput = $icon.siblings('.upload-file-input');
        
        $fileInput.off('change').on('change', function() {
            const file = this.files[0];
            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('account_key', accountKey);

                $.ajax({
                    url: '/upload_transactions',
                    method: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function(response) {
                        if (response.success) {
                            alert(response.message);
                            location.reload();
                        } else {
                            alert('Failed to upload transactions: ' + response.message);
                        }
                    },
                    error: function(xhr, status, error) {
                        alert('An error occurred: ' + xhr.responseText);
                    }
                });
            }
        });

        $fileInput.click();
    });

    // Mobile toggle function
    window.balance_details_toggleDetails = function(button) {
        const card = $(button).closest('.balance_details_card');
        const body = card.find('.balance_details_body');
        const statusElement = card.find('.balance_details_status');

        if (body.is(':hidden')) {
            body.slideDown();
            statusElement.text('Less ▲').css('color', '#ff4d4d');
        } else {
            body.slideUp();
            statusElement.text('More ▼').css('color', '#00cc00');
        }
    };

    // Add Account Popup
    $('#addAccountButton').on('click', function() {
        const today = new Date().toISOString().split('T')[0];
        $('#addAccountBalanceDateInput').val(today);
        $('#addAccountPopup').fadeIn();
    });

    $('#addAccountCloseButton, #addAccountCancelButton').on('click', function() {
        $('#addAccountPopup').fadeOut();
    });

    $('#addAccountPopup').on('click', function(e) {
        if ($(e.target).is('#addAccountPopup')) {
            $('#addAccountPopup').fadeOut();
        }
    });

    $('#addAccountTypeSelect').select2({
        ajax: {
            url: '/get_account_types',
            dataType: 'json',
            processResults: function(data) {
                return {
                    results: data.account_types.map(accountType => ({
                        id: accountType.key,
                        text: accountType.type
                    }))
                };
            }
        },
        placeholder: 'Select an account type',
        allowClear: true
    });

    $('#addAccountForm').on('submit', function(e) {
        e.preventDefault();

        const formData = {
            accountTypeKey: $('#addAccountTypeSelect').val(),
            accountName: $('#addAccountNameInput').val(),
            balance: parseFloat($('#addAccountBalanceInput').val()),
            availableBalance: parseFloat($('#addAccountAvailableBalanceInput').val()) || null,
            organizationDomain: $('#addAccountOrganizationDomainInput').val() || null,
            organizationName: $('#addAccountOrganizationNameInput').val() || null,
            balanceDate: $('#addAccountBalanceDateInput').val()
        };

        $.ajax({
            url: '/addAccount',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                if (response.success) {
                    alert('Account added successfully!');
                    location.reload();
                } else {
                    alert('Failed to add account: ' + response.message);
                }
            },
            error: function(xhr, status, error) {
                alert('An error occurred: ' + xhr.responseText);
            }
        });
    });
});