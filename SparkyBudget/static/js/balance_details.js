$(document).ready(function() {
    // Initialize DataTable with custom styling and debugging
    let table;
    if (!$.fn.dataTable.isDataTable('#balanceTable')) {
        table = $('#balanceTable').DataTable({
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
    } else {
        table = $('#balanceTable').DataTable();
    }

    let accountTypes = [];
    $.ajax({
        url: '/get_account_types',
        method: 'GET',
        success: function(response) {
            if (response.success) {
                accountTypes = response.account_types;
                console.log('Account types loaded:', accountTypes);
            } else {
                console.error('Failed to fetch account types:', response.message);
            }
        },
        error: function(error) {
            console.error('Error fetching account types:', error);
        }
    });

    // Function to format date to YYYY-MM-DD
    function formatDateToYYYYMMDD(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr; // If not a valid date, return as is
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Function to update the row in the database and refresh the row in the table
        // Function to update the row in the database and refresh the row in the table
            // Function to update the row in the database and refresh the row in the table
        // Function to update the row in the database and refresh the row/card
        function updateRow(accountKey, updatedData) { // Removed $row parameter

            // --- Find DataTable row index using accountKey ---
            let rowIndex = -1;
            let originalRowData = null; // To store original data for preserving columns like Upload
            table.rows().every(function (index) {
                const rowData = this.data();
                // Assuming accountKey is in the first column (index 0)
                if (String(rowData[0]) === String(accountKey)) { // Ensure type comparison is safe
                    rowIndex = index;
                    originalRowData = rowData; // Store the original data
                    return false; // Stop iteration once found
                }
                return true;
            });
    
            if (rowIndex === -1) {
                console.error("Could not find DataTable row with accountKey:", accountKey);
                // Decide if update should proceed without table update capability
                // alert("Error: Could not find the row in the table to update.");
                // return; // Option: Stop if table row not found
            }
    
            // Find the selected account type key (using the text from updatedData)
            const accountTypeText = updatedData.account_type;
            const accountType = accountTypes.find(type => type.type === accountTypeText);
            const accountTypeKey = accountType ? accountType.key : null;
    
            if (!accountTypeKey) {
                console.warn('Invalid account type found for update:', accountTypeText);
                // Backend should validate this too. Proceeding with null key for now.
            }
    
            // Get other data directly from updatedData
            const balanceDate = updatedData.last_sync;
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            const formattedBalanceDate = balanceDate && dateRegex.test(balanceDate) ? balanceDate : null;
    
            // Ensure balances are numbers
            const balanceValue = parseFloat(String(updatedData.balance).replace(/[$,]/g, '')); // Clean currency symbols/commas
            const availableBalanceValue = parseFloat(String(updatedData.available_balance).replace(/[$,]/g, ''));
    
            const payload = {
                account_key: accountKey,
                account_type_key: accountTypeKey, // Might be null
                display_account_name: updatedData.display_name,
                balance_date: formattedBalanceDate,
                balance: isNaN(balanceValue) ? null : balanceValue,
                available_balance: isNaN(availableBalanceValue) ? null : availableBalanceValue
            };
    
            // Basic validation before sending
            if (payload.balance === null) {
                 console.error("Invalid balance value before sending:", updatedData.balance);
                 alert("Invalid balance value. Update cancelled.");
                 // TODO: Consider reverting the UI change here
                 return;
            }
             // Allow null/NaN available balance, maybe default on backend or handle there
             if (payload.available_balance === null) {
                 console.warn("Invalid or missing available balance value before sending:", updatedData.available_balance);
                 // payload.available_balance = 0; // Example: Default to 0 if needed
            }
    
    
            $.ajax({
                url: '/update_account',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(payload),
                success: function(response) {
                    if (response.success) {
                        console.log('Account updated successfully via AJAX for key:', accountKey);
                        const updatedRowFromServer = response.updated_row; // Data array from server
    
                        // --- Format data received from server ---
                        let displayDate = '';
                        if (updatedRowFromServer[4]) { // Index 4: Date
                            try {
                                const dateFromServer = new Date(updatedRowFromServer[4]);
                                if (!isNaN(dateFromServer.getTime())) {
                                    const year = dateFromServer.getUTCFullYear();
                                    const month = String(dateFromServer.getUTCMonth() + 1).padStart(2, '0');
                                    const day = String(dateFromServer.getUTCDate()).padStart(2, '0');
                                    displayDate = `${year}-${month}-${day}`;
                                } else { // Fallback for non-date strings
                                    displayDate = String(updatedRowFromServer[4]).split('T')[0];
                                    if (!/^\d{4}-\d{2}-\d{2}$/.test(displayDate)) { displayDate = ''; }
                                }
                            } catch (e) { // Handle potential errors if parsing fails
                                 displayDate = String(updatedRowFromServer[4]).split('T')[0];
                                 if (!/^\d{4}-\d{2}-\d{2}$/.test(displayDate)) { displayDate = ''; }
                            }
                        }
                        const formattedBalance = `$${parseFloat(updatedRowFromServer[5] || 0).toFixed(2)}`; // Index 5: Balance
                        const formattedAvailableBalance = `$${parseFloat(updatedRowFromServer[6] || 0).toFixed(2)}`; // Index 6: Available Balance
    
                        // --- Update DataTable ---
                        if (rowIndex !== -1 && originalRowData) {
                            const uploadColumnHtml = originalRowData[7]; // Preserve original Upload column (index 7)
    
                            table.row(rowIndex).data([
                                updatedRowFromServer[0], // AccountKey
                                updatedRowFromServer[1], // Account Type Text
                                updatedRowFromServer[2], // Bank
                                updatedRowFromServer[3], // Display Account Name
                                displayDate,             // Last Sync (Formatted)
                                formattedBalance,        // Balance (Formatted)
                                formattedAvailableBalance, // Available Balance (Formatted)
                                uploadColumnHtml         // Upload column (Preserved)
                            ]).draw(false); // draw(false) preserves pagination
                            console.log("DataTable row updated for index:", rowIndex);
                        } else {
                             console.warn("DataTable row not updated as index wasn't found for key:", accountKey);
                             // Consider table.ajax.reload() if updates seem missing.
                        }
    
                        // --- Update Mobile Card ---
                        // Find card based on any element inside it having the correct data-account-key
                        const $card = $('.balance_details_card [data-account-key="' + accountKey + '"]').first().closest('.balance_details_card');
                        if ($card.length) {
                            // Update visible elements
                            $card.find('.balance_details_account_name[data-account-key="' + accountKey + '"]').text(updatedRowFromServer[3]);
                            $card.find('.balance_details_last_refreshed[data-account-key="' + accountKey + '"]').text(displayDate);
                            $card.find('.balance_details_balance[data-account-key="' + accountKey + '"]').text(formattedBalance);
                            // Update elements potentially in the hidden body
                            $card.find('.editable-account-type[data-account-key="' + accountKey + '"]').text(updatedRowFromServer[1]);
                            $card.find('.editable-available-balance[data-account-key="' + accountKey + '"]').text(formattedAvailableBalance);
                            console.log("Mobile card updated for key:", accountKey);
                        } else {
                            console.warn("Mobile card not found for key:", accountKey);
                        }
    
                    } else {
                        console.error('Failed to update account:', response.message);
                        alert('Failed to update account: ' + response.message);
                        // TODO: Consider reverting the UI changes in both table and card on failure
                    }
                },
                error: function(xhr, status, error) {
                    let errorMessage = xhr.responseJSON ? xhr.responseJSON.message : 'Unknown error';
                    console.error('Error updating account:', status, error, errorMessage);
                    alert('Error updating account: ' + errorMessage);
                     // TODO: Consider reverting the UI changes in both table and card on error
                }
            });
        }
    

    

    // Handle editable account type
        // Handle editable account type (Desktop and Mobile) - CORRECTED
        $(document).on('click', '.editable-account-type', function(e) {
            const $cell = $(this);
            const accountKey = $cell.data('account-key');
            const currentValue = $cell.text().trim() || '';
            // Determine context
            const isMobile = $cell.closest('.balance-details-mobile-container').length > 0;
            const isDesktop = $cell.closest('#balanceTable').length > 0;
    
            // Prevent re-initialization if select already exists
            if ($cell.find('select.account-type-select').length > 0) {
                // If clicking the select itself, do nothing
                if ($(e.target).is('select.account-type-select')) {
                    return;
                }
                // If clicking cell but not select, maybe refocus? For now, just return.
                return;
            }
    
            // Create dropdown
            let dropdownHtml = '<select class="account-type-select" style="width: 100%;">';
            accountTypes.forEach(type => {
                // Use type.type for comparison and display
                dropdownHtml += `<option value="${type.key}" ${type.type === currentValue ? 'selected' : ''}>${type.type}</option>`;
            });
            dropdownHtml += '</select>';
            $cell.html(dropdownHtml);
    
            const $select = $cell.find('select');
            $select.focus();
    
            // --- Use .one() for change/blur to prevent multiple bindings ---
            $select.one('change blur', function(event) {
                // Check if the select element still exists
                if ($cell.find('select.account-type-select').length === 0) {
                    return; // Already processed or reverted
                }
    
                const selectedOption = $select.find('option:selected');
                const newTypeKey = selectedOption.val(); // The key (e.g., 1, 2, 3)
                const newTypeText = selectedOption.text(); // The text (e.g., "Checking", "Savings")
    
                // Revert if no change or invalid selection
                if (!newTypeKey || newTypeText === currentValue) {
                    $cell.html(currentValue);
                    return;
                }
    
                // Update cell display immediately
                $cell.html(newTypeText);
    
                // --- Gather data based on context ---
                let updatedData = { account_type: newTypeText }; // Start with the new value
    
                if (isDesktop) {
                    const $row = $cell.closest('tr'); // Find row in desktop context
                    updatedData.display_name = $row.find('.editable-display-name').text().trim();
                    updatedData.last_sync = $row.find('.editable-last-sync').text().trim();
                    updatedData.balance = $row.find('.editable-balance').text().trim(); // Keep $
                    updatedData.available_balance = $row.find('.editable-available-balance').text().trim(); // Keep $
                } else if (isMobile) {
                    const $card = $cell.closest('.balance_details_card'); // Find card in mobile context
                    updatedData.display_name = $card.find('.balance_details_account_name[data-account-key="' + accountKey + '"]').text().trim();
                    updatedData.last_sync = $card.find('.balance_details_last_refreshed[data-account-key="' + accountKey + '"]').text().trim();
                    updatedData.balance = $card.find('.balance_details_balance[data-account-key="' + accountKey + '"]').text().trim(); // Keep $
                    updatedData.available_balance = $card.find('.editable-available-balance[data-account-key="' + accountKey + '"]').text().trim(); // Keep $
                } else {
                    console.error("Editable account type not found within known container.");
                    $cell.html(currentValue); // Revert on error
                    return;
                }
                // --- End data gathering ---
    
                // --- Corrected updateRow call ---
                updateRow(accountKey, updatedData);
                // --- End correction ---
            });
    
            // Prevent the document click handler from immediately closing the dropdown if using one
            e.stopPropagation();
    
            // Optional: Handle clicking outside the select to revert (using blur is often better)
            // $(document).one('click', function closeDropdown(event) {
            //     if (!$cell.find('select.account-type-select').length) return; // Already handled
            //     if (!$(event.target).closest('.editable-account-type').length) {
            //         $cell.html(currentValue); // Revert if clicked outside without changing
            //     }
            // });
        });
    

        // Handle editable display name (Desktop and Mobile)
        $(document).on('click', '.editable-display-name', function(event) {
            const $cell = $(this);
            const accountKey = $cell.data('account-key');
            const isMobile = $cell.closest('.balance-details-mobile-container').length > 0;
            const isDesktop = $cell.closest('#balanceTable').length > 0;
    
            if ($cell.find('input.display-name-input').length > 0) {
                if (!$(event.target).is('input.display-name-input')) {
                    $cell.find('input.display-name-input').focus().select();
                }
                return;
            }
    
            const currentValue = $cell.text().trim() || '';
    
            $cell.html(`<input type="text" value="${currentValue}" class="display-name-input" style="width: 90%; box-sizing: border-box;" />`);
            const $input = $cell.find('input');
            $input.focus().select();
    
            // --- Define the update function ---
            const performUpdate = () => {
                if ($cell.find('input.display-name-input').length === 0) return;
    
                const newValue = $input.val().trim();
    
                $input.off('blur keydown'); // Unbind events
    
                if (!newValue || newValue === currentValue) {
                    $cell.html(currentValue);
                    return;
                }
    
                $cell.html(newValue);
    
                let updatedData = { display_name: newValue };
                if (isDesktop) {
                    const $row = $cell.closest('tr');
                    updatedData.account_type = $row.find('.editable-account-type').text().trim();
                    updatedData.last_sync = $row.find('.editable-last-sync').text().trim();
                    updatedData.balance = $row.find('.editable-balance').text().trim();
                    updatedData.available_balance = $row.find('.editable-available-balance').text().trim();
                } else if (isMobile) {
                    const $card = $cell.closest('.balance_details_card');
                    updatedData.account_type = $card.find('.editable-account-type[data-account-key="' + accountKey + '"]').text().trim();
                    updatedData.last_sync = $card.find('.balance_details_last_refreshed[data-account-key="' + accountKey + '"]').text().trim();
                    updatedData.balance = $card.find('.balance_details_balance[data-account-key="' + accountKey + '"]').text().trim();
                    updatedData.available_balance = $card.find('.editable-available-balance[data-account-key="' + accountKey + '"]').text().trim();
                } else {
                    console.error("Editable display name context error.");
                    $cell.html(currentValue);
                    return;
                }
                updateRow(accountKey, updatedData);
            };
            // --- End update function definition ---
    
            // --- Bind events using .on() ---
            $input.on('blur', performUpdate);
            $input.on('keydown', function(e) { // Use keydown for Enter/Escape
                if (e.key === 'Enter') {
                    e.preventDefault();
                    performUpdate();
                } else if (e.key === 'Escape') {
                     e.preventDefault();
                     $input.off('blur keydown');
                     $cell.html(currentValue);
                }
            });
            // --- End event binding ---
        });
    
    
    

        // Handle editable last sync (BalanceDate) (Desktop and Mobile)
        $(document).on('click', '.editable-last-sync', function(e) {
            const $cell = $(this);
            const accountKey = $cell.data('account-key');
            // Determine context
            const isMobile = $cell.closest('.balance-details-mobile-container').length > 0;
            const isDesktop = $cell.closest('#balanceTable').length > 0;
    
            // Prevent re-initialization if input already exists
            if ($cell.find('input.last-sync-input').length > 0) {
                if (!$(e.target).is('input.last-sync-input')) {
                     $cell.find('input.last-sync-input').focus();
                }
                return;
            }
    
            const currentValue = $cell.text().trim() || '';
            $cell.data('original-value', currentValue); // Store original value
    
            $cell.html(`<input type="text" value="${currentValue}" class="last-sync-input" style="width: 100px;"/>`);
            const $input = $cell.find('input.last-sync-input');
    
            let dateSelected = false;
            let escapePressed = false;
    
            // --- Centralized update and cleanup function ---
            const handleUpdateAndCleanup = (newValue, isEscape = false) => {
                const $currentInput = $cell.find('input.last-sync-input');
                if ($currentInput.length === 0) {
                     console.log("Cleanup: Input already removed.");
                     return;
                }
    
                const originalValue = $cell.data('original-value');
    
                // Delay Datepicker Destruction
                setTimeout(() => {
                    try {
                        const $inputExists = $cell.find('input.last-sync-input');
                        if ($inputExists.length && $inputExists.hasClass('hasDatepicker')) {
                            console.log("Destroying datepicker via setTimeout...");
                            $inputExists.datepicker('destroy');
                        } else {
                            console.log("Datepicker already destroyed or input removed before setTimeout ran.");
                        }
                    } catch (err) {
                        console.warn('Error destroying datepicker via setTimeout:', err);
                    }
                }, 0);
    
                // Handle Escape
                if (isEscape) {
                    console.log("Handling Escape: Reverting to original value.");
                    $cell.html(originalValue);
                    $cell.removeData('original-value');
                    return;
                }
    
                // Proceed with update logic
                let valueToUpdate = newValue ? newValue.trim() : '';
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    
                // Validate date format
                if (!valueToUpdate || !dateRegex.test(valueToUpdate)) {
                    console.warn('Invalid or empty date:', valueToUpdate, 'Reverting to:', originalValue);
                    valueToUpdate = originalValue;
                }
    
                // Update cell display immediately
                $cell.html(valueToUpdate);
                $cell.removeData('original-value');
    
                // Only call AJAX if the value actually changed and is valid
                if (valueToUpdate !== originalValue && dateRegex.test(valueToUpdate)) {
                    console.log('Preparing AJAX update for date:', valueToUpdate);
    
                    // --- Gather data based on context ---
                    let updatedData = { last_sync: valueToUpdate }; // Start with the new value
    
                    if (isDesktop) {
                        const $row = $cell.closest('tr'); // Find the row for desktop context
                        updatedData.account_type = $row.find('.editable-account-type').text().trim();
                        updatedData.display_name = $row.find('.editable-display-name').text().trim();
                        updatedData.balance = $row.find('.editable-balance').text().trim(); // Keep $
                        updatedData.available_balance = $row.find('.editable-available-balance').text().trim(); // Keep $
                    } else if (isMobile) {
                        const $card = $cell.closest('.balance_details_card'); // Find the card for mobile context
                        updatedData.account_type = $card.find('.editable-account-type[data-account-key="' + accountKey + '"]').text().trim();
                        updatedData.display_name = $card.find('.balance_details_account_name[data-account-key="' + accountKey + '"]').text().trim();
                        updatedData.balance = $card.find('.balance_details_balance[data-account-key="' + accountKey + '"]').text().trim(); // Keep $
                        updatedData.available_balance = $card.find('.editable-available-balance[data-account-key="' + accountKey + '"]').text().trim(); // Keep $
                    } else {
                        console.error("Editable date not found within known container.");
                        // Optionally revert UI if context is unknown
                        return;
                    }
                    // --- End data gathering ---
    
                    // Call updateRow with accountKey and the gathered data object
                    updateRow(accountKey, updatedData);
    
                } else {
                    console.log('Date not changed or invalid, no AJAX update sent.');
                }
            };
            // --- End Centralized update and cleanup function ---
    
            // Initialize jQuery UI Datepicker
            try {
                $input.datepicker({
                    dateFormat: 'yy-mm-dd',
                    changeMonth: true,
                    changeYear: true,
                    showAnim: 'slideDown',
                    onSelect: function(dateText, inst) {
                        console.log("onSelect triggered with:", dateText);
                        dateSelected = true;
                        handleUpdateAndCleanup(dateText);
                    },
                    onClose: function(dateText, inst) {
                        console.log("onClose triggered. dateSelected:", dateSelected, "escapePressed:", escapePressed, "dateText:", dateText);
                        setTimeout(() => {
                            if (!dateSelected && !escapePressed && $cell.find('input.last-sync-input').length > 0) {
                                 console.log("Handling update via onClose.");
                                 handleUpdateAndCleanup(dateText);
                            } else {
                                 console.log("onClose: Action already handled by onSelect or Escape, or input gone.");
                            }
                        }, 50);
                    }
                });
    
                $input.datepicker('show');
                $input.focus();
    
                $input.on('keypress', function(e) {
                    if (e.which === 13) {
                        e.preventDefault();
                        console.log("Enter key pressed.");
                        dateSelected = true;
                        handleUpdateAndCleanup($input.val());
                    }
                });
    
                 $input.on('keydown', function(e) {
                    if (e.key === "Escape") {
                        e.preventDefault();
                        console.log("Escape key pressed.");
                        escapePressed = true;
                        try {
                            if ($input.hasClass('hasDatepicker')) {
                                $input.datepicker('hide');
                            }
                        } catch(err) { console.warn("Error hiding datepicker on escape:", err); }
                        handleUpdateAndCleanup(null, true);
                    }
                });
    
            } catch (error) {
                console.error('Error initializing datepicker:', error);
                $cell.html(currentValue);
                $cell.removeData('original-value');
            }
        });
    
    

    
            // Handle editable balance (Desktop and Mobile)
    $(document).on('click', '.editable-balance', function(event) {
        const $cell = $(this);
        const accountKey = $cell.data('account-key');
        const isMobile = $cell.closest('.balance-details-mobile-container').length > 0;
        const isDesktop = $cell.closest('#balanceTable').length > 0;

        if ($cell.find('input.balance-input').length > 0) {
            if (!$(event.target).is('input.balance-input')) {
                $cell.find('input.balance-input').focus().select();
            }
            return;
        }

        const currentText = $cell.text().trim();
        const currentValue = parseFloat(currentText.replace(/[$,]/g, '')) || 0;

        $cell.html(`<input type="number" step="0.01" value="${currentValue.toFixed(2)}" class="balance-input" style="width: 90%; box-sizing: border-box;" />`);
        const $input = $cell.find('input');
        $input.focus().select();

        // --- Define the update function ---
        const performUpdate = () => {
            // Check if input still exists (might have been removed by another event)
            if ($cell.find('input.balance-input').length === 0) return;

            const newValueRaw = $input.val().trim();
            const newValueParsed = parseFloat(newValueRaw);

            // Unbind events immediately to prevent double execution
            $input.off('blur keydown');

            if (newValueRaw === '' || isNaN(newValueParsed) || newValueParsed === currentValue) {
                $cell.html(`$${currentValue.toFixed(2)}`); // Revert display
                return;
            }

            const newValueFormatted = newValueParsed.toFixed(2);
            $cell.html(`$${newValueFormatted}`); // Update display

            // Gather data based on context
            let updatedData = { balance: newValueFormatted };
            if (isDesktop) {
                const $row = $cell.closest('tr');
                updatedData.account_type = $row.find('.editable-account-type').text().trim();
                updatedData.display_name = $row.find('.editable-display-name').text().trim();
                updatedData.last_sync = $row.find('.editable-last-sync').text().trim();
                updatedData.available_balance = $row.find('.editable-available-balance').text().trim();
            } else if (isMobile) {
                const $card = $cell.closest('.balance_details_card');
                updatedData.account_type = $card.find('.editable-account-type[data-account-key="' + accountKey + '"]').text().trim();
                updatedData.display_name = $card.find('.balance_details_account_name[data-account-key="' + accountKey + '"]').text().trim();
                updatedData.last_sync = $card.find('.balance_details_last_refreshed[data-account-key="' + accountKey + '"]').text().trim();
                updatedData.available_balance = $card.find('.editable-available-balance[data-account-key="' + accountKey + '"]').text().trim();
            } else {
                console.error("Editable balance context error.");
                $cell.html(`$${currentValue.toFixed(2)}`); // Revert on error
                return;
            }
            updateRow(accountKey, updatedData); // Call updateRow
        };
        // --- End update function definition ---

        // --- Bind events using .on() ---
        $input.on('blur', performUpdate);
        $input.on('keydown', function(e) {
            if (e.key === 'Enter') { // Use keydown and check for 'Enter' key
                e.preventDefault(); // Prevent default Enter behavior
                performUpdate();
            } else if (e.key === 'Escape') { // Handle Escape key to cancel
                 e.preventDefault();
                 $input.off('blur keydown'); // Unbind events
                 $cell.html(`$${currentValue.toFixed(2)}`); // Revert display
            }
        });
        // --- End event binding ---
    });

    

        // Handle editable available balance (Desktop and Mobile)
        $(document).on('click', '.editable-available-balance', function(event) {
            const $cell = $(this);
            const accountKey = $cell.data('account-key');
            const isMobile = $cell.closest('.balance-details-mobile-container').length > 0;
            const isDesktop = $cell.closest('#balanceTable').length > 0;
    
            if ($cell.find('input.available-balance-input').length > 0) {
                 if (!$(event.target).is('input.available-balance-input')) {
                    $cell.find('input.available-balance-input').focus().select();
                }
                return;
            }
    
            const currentText = $cell.text().trim();
            const currentValue = parseFloat(currentText.replace(/[$,]/g, '')) || 0;
    
            $cell.html(`<input type="number" step="0.01" value="${currentValue.toFixed(2)}" class="available-balance-input" style="width: 90%; box-sizing: border-box;" />`);
            const $input = $cell.find('input');
            $input.focus().select();
    
            // --- Define the update function ---
            const performUpdate = () => {
                if ($cell.find('input.available-balance-input').length === 0) return;
    
                const newValueRaw = $input.val().trim();
                const newValueParsed = parseFloat(newValueRaw);
    
                $input.off('blur keydown'); // Unbind events
    
                if (newValueRaw === '' || isNaN(newValueParsed) || newValueParsed === currentValue) {
                    $cell.html(`$${currentValue.toFixed(2)}`);
                    return;
                }
    
                const newValueFormatted = newValueParsed.toFixed(2);
                $cell.html(`$${newValueFormatted}`);
    
                let updatedData = { available_balance: newValueFormatted };
                if (isDesktop) {
                    const $row = $cell.closest('tr');
                    updatedData.account_type = $row.find('.editable-account-type').text().trim();
                    updatedData.display_name = $row.find('.editable-display-name').text().trim();
                    updatedData.last_sync = $row.find('.editable-last-sync').text().trim();
                    updatedData.balance = $row.find('.editable-balance').text().trim();
                } else if (isMobile) {
                    const $card = $cell.closest('.balance_details_card');
                    updatedData.account_type = $card.find('.editable-account-type[data-account-key="' + accountKey + '"]').text().trim();
                    updatedData.display_name = $card.find('.balance_details_account_name[data-account-key="' + accountKey + '"]').text().trim();
                    updatedData.last_sync = $card.find('.balance_details_last_refreshed[data-account-key="' + accountKey + '"]').text().trim();
                    updatedData.balance = $card.find('.balance_details_balance[data-account-key="' + accountKey + '"]').text().trim();
                } else {
                    console.error("Editable available balance context error.");
                    $cell.html(`$${currentValue.toFixed(2)}`);
                    return;
                }
                updateRow(accountKey, updatedData);
            };
            // --- End update function definition ---
    
            // --- Bind events using .on() ---
            $input.on('blur', performUpdate);
            $input.on('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    performUpdate();
                } else if (e.key === 'Escape') {
                     e.preventDefault();
                     $input.off('blur keydown');
                     $cell.html(`$${currentValue.toFixed(2)}`);
                }
            });
            // --- End event binding ---
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
                            // Refresh the entire table since transactions might affect balances
                            $.ajax({
                                url: '/get_balance_data',
                                method: 'GET',
                                success: function(response) {
                                    if (response.success) {
                                        table.clear();
                                        response.data.forEach(row => {
                                            table.row.add([
                                                row[0],
                                                row[1],
                                                row[2],
                                                row[3],
                                                row[4],
                                                `$${row[5]}`,
                                                `$${row[6]}`,
                                                '<span class="upload-icon" data-account-key="' + row[0] + '">↑↓</span><input type="file" class="upload-file-input" style="display: none;" />'
                                            ]);
                                        });
                                        table.draw();
                                        console.log('Table data refreshed successfully');
                                    }
                                }
                            });
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
                    // Clear the form fields
                    $('#addAccountTypeSelect').val(null).trigger('change'); // Clear Select2
                    $('#addAccountOrganizationNameInput').val(''); // Corrected ID for Bank
                    $('#addAccountNameInput').val(''); // Corrected ID for Display Name
                    $('#addAccountBalanceInput').val('');
                    $('#addAccountBalanceDateInput').val(''); // Clear Balance Date
                    $('#addAccountAvailableBalanceInput').val('');
                    $('#addAccountOrganizationDomainInput').val(''); // Clear Organization Domain

                    // Close the popup
                    $('#addAccountPopup').css('display', 'none');

                    // Refresh the entire table since a new account was added
                    // Fetch the updated page content
                    $.ajax({
                        url: '/', // Fetch the entire page HTML
                        method: 'GET',
                        success: function(htmlResponse) {
                            const $fetchedHtml = $(htmlResponse);

                            // Update Desktop Table
                            const $newTable = $fetchedHtml.find('#balanceTable').first();
                            if ($newTable.length) {
                                // Destroy the old DataTable instance
                                if ($.fn.dataTable.isDataTable('#balanceTable')) {
                                    table.destroy();
                                    console.log('Old DataTable instance destroyed.');
                                }
                                // Replace the old table HTML with the new one
                                $('#balanceTable').replaceWith($newTable);
                                console.log('Desktop table HTML replaced.');
                                // Re-initialize DataTable on the new table element
                                table = $('#balanceTable').DataTable({
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
                                        console.log('New DataTable instance initialized.');
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
                                console.log('Desktop table refreshed successfully');
                            } else {
                                console.warn('Could not find #balanceTable in fetched HTML.');
                            }

                            // Update Mobile Container
                            const $mobileContainer = $fetchedHtml.find('.balance-details-mobile-container').first();
                            if ($mobileContainer.length) {
                                $('.balance-details-mobile-container').replaceWith($mobileContainer);
                                console.log('Mobile view refreshed successfully');
                                // Note: Event listeners for mobile view (like toggleDetails) might need re-binding
                                // if they are not using delegated event handling.
                            } else {
                                console.warn('Could not find .balance-details-mobile-container in fetched HTML.');
                            }
                        },
                        error: function(xhr, status, error) {
                            console.error('Error fetching HTML for refresh:', status, error);
                        }
                    });
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