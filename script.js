// Constants
var BASE_VOLUME    =   0.100; // Base volume. Quiet enough that it needs conscious attention.
var TEST_VOLUME    =   0.080; // Volume during attention test
var BASE_LEN_SEC   =      40; // Base time length in seconds
var TEST_GRACE_SEC =       6; // Test grace period after fadeout has finished
var PERIOD_FACTOR  =     1.3; // Factor used to increase or decrease period length

// Global state (forgive my poor javascript!)
var rain     = document.getElementById('rain');     // Audio for rain background sound
var bell     = document.getElementById('bell');     // Audio for meditation bell
var rain_gain = null;                               // Rain audio gain (volume) node
var timer     = null;                               // Current timer
var ignore_keypress  = false;                       // Whether keypresses are currently ignored
var test_is_ongoing  = false;                       // Whether the attention test has began
var session_start_time = 0;                         // Start time of this session
var period_len_sec   = 0;                           // Length of the current period in seconds

function start_button_pressed()
{
    log_message('Start button was pressed');

    // Fade out top container and fade in bottom container
    display_feedback('top_container',    false);
    display_feedback('bottom_container',  true);

    // Redirect key and mouse presses
    document.onkeypress  = key_was_pressed;
    //document.onmousedown = key_was_pressed;

    // Start the meditation session
    session_start();
}

function display_feedback(name, onoff)
{
    var elem = document.getElementById(name);

    if (onoff)
    {
        elem.style.animation = 'blurFadeIn 0.9s forwards';
        elem.style.animationDelay = '1s';
    }
    else
    {
        elem.style.animation = 'blurFadeOut 2s forwards';
        elem.style.animationDelay = '0s';
    }
}

function rain_begin_playing()
{
    // Workaround to ensure seamless looping sound
    // See http://stackoverflow.com/a/29901435
    var context = new AudioContext();
    var source  = context.createBufferSource();
    rain_gain   = context.createGain();
    rain_gain.gain.value = BASE_VOLUME;
    source.connect(rain_gain);
    rain_gain.connect(context.destination);

    var request = new XMLHttpRequest();
    request.open('GET', rain.innerHTML, true); 
    request.responseType = 'arraybuffer';
    request.onload = function()
    {
        context.decodeAudioData(request.response, function(response)
        {
            source.buffer = response;
            source.start(0);
            source.loop = true;
        }, function () { console.error('The request failed.'); } );
    };
    request.send();
}

function rain_volume(vol)
{
    rain_gain.gain.value = vol;
}

function session_start()
{
    log_message('Meditation session begins...');

    timer  = null;
    ignore_keypress = false;
    session_start_time = Date.now();
    period_len_sec    = BASE_LEN_SEC;

    log_message(rain.currentSrc);
    // Start playing the rain in the background
    rain_begin_playing();

    // Play the bell once at the beginning of the meditation session
    // Delay bell by a little so that it comes after the rain has started
    window.setTimeout(function() { bell.play(); }, 1000);

    // Prompt the user to pay attention
    display_feedback('fb_listen', true);

    // Now wait and test if user was paying attention
    period_begin_now(period_len_sec);
}

function period_begin_now(length_sec)
{
    log_message('Period of length ' + length_sec + ' begins...');

    rain_volume(BASE_VOLUME);

    test_is_ongoing = false;
    period_len_sec  = length_sec;
    display_feedback('fb_listen', true);

    timer = window.setTimeout(test_begin_now, length_sec * 1000);
}

function test_begin_now()
{
    log_message('Test period started');

    // TBD: We wanted a fade out animation but it appears like it's not supported in vanilla CSS/Javascript
    test_is_ongoing = true;
    rain_volume(TEST_VOLUME);

    timer = window.setTimeout(test_end_now, TEST_GRACE_SEC * 1000);
}

function test_end_now()
{
    log_message('Test period finished without user pressing any key');

    test_is_ongoing = false;
    session_end('fb_wander');
}

// This is called when the user fails the test
function session_end(feedback)
{
    ignore_keypress = true;

    // Play light rain sound plus start bell sound from the beginning
    rain_volume(TEST_VOLUME);
    bell.pause();
    bell.currentTime = 0;
    bell.play();

    // Explain why session has ended
    display_feedback('fb_listen', false);
    display_feedback(feedback,    true);
    display_feedback('fb_theend', true);

    // Update score
    session_length = Math.ceil((Date.now() - session_start_time) / (60 * 1000));
    document.getElementById('score_value').innerHTML = (session_length == 1)? '1 minute' : session_length + ' minutes';
    display_feedback('fb_score', true);

    // TBD: Require user to click a button to begin a new session
}

function key_was_pressed()
{
    if (ignore_keypress)
    {
        return;
    }

    // Any key press at any time stops any ongoing timer
    if (timer)
    {
        window.clearTimeout(timer);
        timer = null;
    }

    // Did the key press come at the right time?
    if (test_is_ongoing)
    {
        log_message('User passed the test')

        // Give some encouragement. Note trickery needed to restart an animation
        var goodjob = document.getElementById('fb_goodjob');
        var cloned  = goodjob.cloneNode(true);
        goodjob.parentNode.replaceChild(cloned, goodjob);

        cloned.style.animation = 'blurFadeInThenOut 4s forwards';

        // TBD: Limit period length to some threshold
        period_len_sec *= PERIOD_FACTOR;
        period_begin_now(period_len_sec);
    }
    else
    {
        log_message('User pressed a key too early')

        session_end('fb_eager');
    }
}

function log_message(msg)
{
    console.log(msg);
}

