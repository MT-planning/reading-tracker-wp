=== Reading Tracker ===
Contributors: mtplanning
Tags: accessibility, reading, reading guide, dyslexia, a11y
Requires at least: 6.3
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Adds a reading guide to your site: visitors can dim the page and keep a reading band that follows the pointer.

== Description ==

Reading Tracker adds a small button to your site. Visitors who find long text hard to follow can turn on a reading guide: the page is dimmed except for a band that follows the mouse pointer or finger, so they can keep their place line by line.

Visitors can adjust the guide from its panel:

* Height and color of the reading band, color and opacity of the mask
* "Sharper text" mode (multiply blending)
* Vertical writing mode (for Japanese vertical text)
* Text size, line spacing and font of the post content
* Keyboard shortcuts: Alt + Shift + G (show / hide), Alt + Shift + F (full screen), Esc (hide)

As the site owner you can choose, under Settings > Reading Tracker:

* Where the guide is available: all pages, or only single pages of selected content types
* Per post / page override: show or hide the guide from the edit screen
* Button position, which features are available, and the content area that text changes apply to
* The initial guide settings visitors see first

The guide is drawn in its own Shadow DOM, so it does not interfere with your theme's styles. The script is bundled with the plugin; nothing is loaded from external servers.

= Privacy =

This plugin does not collect personal data, does not use cookies and does not send anything to external servers. Visitors' own guide settings are stored only in their browser (localStorage and sessionStorage).

= Third-party library =

This plugin bundles [@mt-planning/reading-tracker](https://github.com/MT-planning/reading-tracker) (MIT License, © MT-planning, Ltd.). `assets/js/reading-tracker.js` is its unminified source build; `assets/js/reading-tracker.min.js` is the minified version that is loaded on the front end.

== Installation ==

1. Install the plugin from Plugins > Add New, or upload the `reading-tracker` folder to `/wp-content/plugins/`.
2. Activate the plugin.
3. Adjust the settings under Settings > Reading Tracker if needed.

== Frequently Asked Questions ==

= Text size does not change. =

The text size is changed by scaling the root font size (`html { font-size }`). If your theme sets font sizes in fixed `px`, the text will not get larger.

= The layout breaks when line spacing or font is changed. =

Set "Content area" to a selector that matches only your post content. The default is `.entry-content, .wp-block-post-content`, which fits most classic and block themes.

= Can I control where the guide appears from code? =

Use the `mtp_rt_enabled` filter (return `false` to disable it on the current request), and the `mtp_rt_library_options` filter to change the options passed to `ReadingTracker.init()`.

== Changelog ==

= 0.1.0 =
* First release. Bundles @mt-planning/reading-tracker 0.1.1.
