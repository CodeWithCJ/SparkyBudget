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