/* global $, jQuery, URL, location, path, HtmlWhitelistedSanitizer */
var TOC = [];
var current_slide = 0;
var total_slides = 0;

let params = (new URL(location)).searchParams;
//var path = window.location.pathname.split('index.html')[0];

//var preprocess = params.has('preprocess');
//var postprocess = params.has('postprocess');

// let user select section heading and header tags
var header = params.get('header');
if (!header) header = 'h1';
var heading = params.get('heading');
if (!heading) heading = 'h2';

// allow user to override fontsize
var fontsize = params.get('fontsize');
if (fontsize) {
    $('#wrapper').css('font-size', fontsize + '%');
}

var gist = params.get('gist');
var filename = params.get('filename');

jQuery(document).ready(function() {

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
        su_render( objects[0] );
    }).error(function(e) {
        console.log('Error on ajax return.');
    });
    
    function su_render( data ) {
        render( data );
        render_sections();
        check_css();
        render_info();
        register_keys();
    }
    
    function check_css() {
        // allow for custom CSS via Gist
        var css = params.get('css');
        var cssfilename = params.get('cssfilename');
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
            html: false, // Enable HTML tags in source
            xhtmlOut: true, // Use '/' to close single tags (<br />).
            breaks: true, // Convert '\n' in paragraphs into <br>
            langPrefix: 'language-', // CSS language prefix for fenced blocks.
            linkify: true,
            typographer: true,
            quotes: '“”‘’'
        });
        $('#wrapper').html( md.render( content ) );
        // render entire text for background image
        $('body').append('<div id="bg"></div>');
        $('#bg').html( md.render( content ) );
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
                case 191:
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