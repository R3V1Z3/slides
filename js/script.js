/* global $, jQuery, dragula, location, HtmlWhitelistedSanitizer */
var TOC = [];
var gist;
var document_content;
var current_slide = 0;
var total_slides = 0;
jQuery(document).ready(function() {
    
    // get url parameters
    // from http://stackoverflow.com/questions/11582512/how-to-get-url-parameters-with-javascript/11582513#11582513
    function getURLParameter(name) {
        return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [, ""])[1].replace(/\+/g, '%20')) || null;
    }
    
    var fontsize = getURLParameter('fontsize');
    if (!fontsize) fontsize = 110;
    $('body').css('font-size', fontsize + '%');
    
    var showonly = getURLParameter('showonly');
    if (!showonly) showonly = '';
    
    var header = getURLParameter('header');
    if (!header) header = 'h1';
    var heading = getURLParameter('heading');
    if (!heading) heading = 'h2';
    
    var gist = getURLParameter('gist');
    var filename = getURLParameter('filename');
    if (!gist) gist = '4cef45f3d84ef7de915e526ef0e64cca';
    $.ajax({
        url: 'https://api.github.com/gists/' + gist,
        type: 'GET',
        dataType: 'jsonp'
    }).success(function(gistdata) {
        var objects = [];
        if (!filename) {
            for (var file in gistdata.data.files) {
                if (gistdata.data.files.hasOwnProperty(file)) {
                    var o = gistdata.data.files[file].content;
                    if (o) {
                        objects.push(o);
                    }
                }
            }
        } else {
            objects.push(gistdata.data.files[filename].content);
        }
        render( objects[0] );
        render_sections();
        check_css();
        render_info();
        register_keys();
    }).error(function(e) {
        console.log('Error on ajax return.');
    });
    
    function check_css() {
        // allow for custom CSS via Gist
        var css = getURLParameter('css');
        var cssfilename = getURLParameter('cssfilename');
        if (css) {
            $.ajax({
                url: 'https://api.github.com/gists/' + css,
                type: 'GET',
                dataType: 'jsonp'
            }).success(function(gistdata) {
                var objects = [];
                if (!cssfilename) {
                    for (var file in gistdata.data.files) {
                        if (gistdata.data.files.hasOwnProperty(file)) {
                            var o = gistdata.data.files[file].content;
                            if (o) {
                                objects.push(o);
                            }
                        }
                    }
                }
                else {
                    objects.push(gistdata.data.files[filename].content);
                }
                render_css(objects[0]);
            }).error(function(e) {
                console.log('Error on ajax return.');
            });
        }
    }
    
    function render_css(css) {
        // attempt to sanitize CSS so hacker don't splode our website
        var parser = new HtmlWhitelistedSanitizer(true);
        var sanitizedHtml = parser.sanitizeString(css);
        $('head').append('<style>' + sanitizedHtml + '</style>');
    }

    function render(content) {
        var md = window.markdownit({
            html: true, // Enable HTML tags in source
            xhtmlOut: true, // Use '/' to close single tags (<br />).
            breaks: false, // Convert '\n' in paragraphs into <br>
            langPrefix: 'language-', // CSS language prefix for fenced blocks.
            linkify: true,
            typographer: true,
            quotes: '“”‘’'
        });
        content = content.replace(/[:;]/g, ':<br />');
        $('#wrapper').html( md.render( content ) );
    }
    
    function render_sections() {
        
        // remove any empty p elements
        $( 'p:empty' ).remove();
        
        var counter = 0;
        $('#wrapper').children().each(function() {
            if ( $(this).is('p') ) {
                $(this).html(function(i, html){
                    // split at br tags and wrap content with slide divs
                     var txt = html.split('<br>');
                     for( var x = 0; x < txt.length; x++ ) {
                        var content = '<div id="slide-' + counter + '" class="slide">';
                        content += '<div class="content">';
                        content += '<p>' + txt[x] + "</p></div></div>";
                        $('#wrapper').append( content );
                        counter++;
                     }
                });
                // p tag contents moved to wrapper so remove original now
                $(this).remove();
            } else {
                var content_div = '<div class="content"/>';
                var slide_div = '<div id="slide-' + counter + '" class="slide"/>';
                $(this).wrap( slide_div ).wrap( content_div );
                counter++;
            }
        });
        
        // fade all slides to start with
        $('.slide').fadeOut();
        total_slides = counter - 1;
        $('#slide-' + current_slide).addClass('current').fadeIn();
    }
    
    function toc_html() {
        var html = '';
        // iterate section classes and get id name to compose TOC
        $( '.slide' ).each(function() {
            var name = $( this ).attr( 'id' );
            name = name.split('[')[0];
            html += '<a href="#' + name + '">';
            html += name;
            html += '</a>';
        });
        return html;
    }
    
    function render_info() {
        // render TOC
        $('#toc').html( toc_html() );
        
        // command count
        var command_count = $('li').length;
        $('#command-count').html('<kbd>X</kbd> - open export window.');
        
        // hide info
        $('#hide').click(function() {
            $('#info').toggle();
        });
        $('#info').toggle();
        
        var url = 'https://gist.github.com/' + gist;
        $('#gist-url').html('<a href="' + url + '">' + gist + '</a>');
    }
    
    function remove_old(slide) {
            $('#slide-' + slide).removeClass('current').fadeOut();
            $('#slide-' + slide + ' .content').children().removeClass('fade');
    }
    
    function change_slide(slide) {
        var $current = $('#slide-' + slide).addClass('current').fadeIn();
        $current.find('.content').children().addClass('fade');
        var $clone = $current.clone().appendTo('#wrapper');
        $clone.attr('id', 'clone');
        $clone.css({
            'opacity': 0.15,
            'transform': 'scale(3)',
            'left': '200px'
        });
        $clone.fadeOut( 4000, function() { $(this).remove(); });
    }
    
    function register_keys() {
        // Add listeners for keypress commands
        $(document).keydown(function(e) {
            
            switch ( e.which ) {
                case 104:
                case 63:
                case 72:
                case 47:
                    $('#info').toggle();
                    break;
                case 109:
                case 189:
                case 100:
                case 37:
                    // LEFT
                    remove_old(current_slide);
                    current_slide--;
                    if ( current_slide < 0 ) current_slide = total_slides;
                    change_slide(current_slide);
                    break;
                case 107:
                case 187:
                case 102:
                case 39:
                    // RIGHT
                    remove_old(current_slide);
                    current_slide++;
                    if ( current_slide > total_slides ) current_slide = 0;
                    change_slide(current_slide);
                    break;
                default: 
                    console.log("Default response for switch statement.");
            }
            
        });
    }
    
});