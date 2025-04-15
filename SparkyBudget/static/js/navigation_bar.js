$(document).ready(function () {
    $(document).on('click', '#syncNavItem, #syncNavItem .nav-text', function (e) {
        e.preventDefault();
        console.log('Sync clicked:', e.target);
        $('#downloadButton').addClass('spinning');
        $.ajax({
            url: '/download_data',
            type: 'POST',
            success: function (response) {
                $('#downloadButton').removeClass('spinning');
                if (response.success) {
                    alert(response.message);
                    location.reload();
                } else {
                    alert('Error: ' + response.message);
                }
            },
            error: function (error) {
                $('#downloadButton').removeClass('spinning');
                alert('Error: ' + error.statusText);
            }
        });
    });
});