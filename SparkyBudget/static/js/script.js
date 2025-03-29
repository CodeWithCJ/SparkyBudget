function toggleRow(element) {
    console.log('Toggle function called');
    var row = element.closest('tr');
    var nextRow = row.nextElementSibling;

    if (nextRow && nextRow.classList.contains('child-row')) {
        if (nextRow.style.display === 'none') {
            console.log('Expanding row');
            nextRow.style.display = '';
            element.innerHTML = '&#9660;'; // Down arrow
        } else {
            console.log('Collapsing row');
            nextRow.style.display = 'none';
            element.innerHTML = '&#9654;'; // Right arrow
        }
    } else {
        // If the next row is not a direct sibling, search in the nested tbody
        nextRow = row.parentElement.querySelector('.child-row');
        if (nextRow) {
            if (nextRow.style.display === 'none') {
                console.log('Expanding row');
                nextRow.style.display = '';
                element.innerHTML = '&#9660;'; // Down arrow
            } else {
                console.log('Collapsing row');
                nextRow.style.display = 'none';
                element.innerHTML = '&#9654;'; // Right arrow
            }
        }
    }
}

function balanceDetailsTableToggleVisibility() {
    var balanceDetailsTable = document.getElementById('balanceDetailsTable');
    var isHidden = balanceDetailsTable.classList.contains('hidden-balance-details');

    if (isHidden) {
        balanceDetailsTable.classList.remove('hidden-balance-details');
    } else {
        balanceDetailsTable.classList.add('hidden-balance-details');
    }
}