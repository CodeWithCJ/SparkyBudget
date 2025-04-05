$(document).ready(function () {
    // Download button handler
    $('#downloadButton').on('click', function () {
        $('#spinner').show();
        $.ajax({
            url: '/download_data',
            type: 'POST',
            success: function (response) {
                $('#spinner').hide();
                if (response.success) {
                    alert(response.message);
                    location.reload();
                } else {
                    alert('Error: ' + response.message);
                }
            },
            error: function (error) {
                $('#spinner').hide();
                alert('Error: ' + error.statusText);
            }
        });
    });
});