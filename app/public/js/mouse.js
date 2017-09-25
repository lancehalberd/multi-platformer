
var mousePosition = [140, 20];

$(document).on("mousemove", updateMousePosition);
var mouseDown = false;
var rightMouseDown = false;
$(document).on('mousedown', function (event) {
    if (event.which == 1) mouseDown = true;
    else if (event.which == 3) rightMouseDown = true;
});
$(document).on('mouseup', function (event) {
    if (event.which == 1) mouseDown = false;
    else if (event.which == 3) rightMouseDown = false;
});
$(document).on('contextmenu', function (event) {
    mouseDown = rightMouseDown = false;
});
function updateMousePosition(event) {
    mousePosition = [event.pageX - $('.js-mouseContainer').offset().left,
                     event.pageY - $(".js-mouseContainer").offset().top];
}
function relativeMousePosition(element) {
    var elementOffset = $(element).offset();
    var containerOffset = $('.js-mouseContainer').offset();
    return [mousePosition[0] - (elementOffset.left - containerOffset.left),
            mousePosition[1] - (elementOffset.top - containerOffset.top)];
}
function isMouseOverElement(element) {
    var relativePosition = relativeMousePosition(element);
    return relativePosition[0] >= 0 && relativePosition[0] <= $(element).outerWidth()
        && relativePosition[1] >= 0 && relativePosition[1] <= $(element).outerHeight();
}