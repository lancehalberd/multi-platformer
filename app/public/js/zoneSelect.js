$('.js-zoneSelect').on('change', function () {
    var $select = $(this);
    //console.log(document.activeElement);
    $select.blur();
    var newZoneId = $select.val();
    if (newZoneId === zoneId) return;
    sendData({action: 'changeZone', zoneId: newZoneId});
});