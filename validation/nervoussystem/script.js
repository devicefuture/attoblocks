var workspace = null;
var context = null;

window.addEventListener("load", function() {
    workspace = document.querySelector("#workspace");
    context = workspace.getContext("2d");

    context.beginPath();
    context.rect(10, 10, 100, 100);
    context.fill();
});