define([
    'dojo/_base/declare',
    'JBrowse/Plugin'
],
function (
    declare,
    JBrowsePlugin
) {
    return declare(JBrowsePlugin, {
        constructor: function (args) {
            var browser = args.browser;

            // Do anything you need to initialize your plugin here
            console.log('MPilup plugin starting');
        }
    });
});
