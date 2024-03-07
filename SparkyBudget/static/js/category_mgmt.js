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
                    return '<button onclick="deleteSubCategory(' + data + ')">Delete</button>';
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
                    return '<button onclick="deleteRule(' + data + ')">Delete</button>';
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

    $('#category').select2({
        width: '100%',
        ajax: {
            url: '/getCategory', // Adjust this to your endpoint for fetching unique categories
            processResults: function (data) {
                return {
                    results: $.map(data, function (item) {
                        return {
                            id: item.Category,
                            text: item.Category
                        };
                    })
                };
            }
        }
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
            $('#categoryTable').DataTable().ajax.reload();
        }
    });
}