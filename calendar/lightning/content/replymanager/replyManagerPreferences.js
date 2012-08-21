/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Global Object to hold methods for the Reply Manager pref pane
 */
var gReplyManagerPane = {
  enableReplyManagerCheckbox: null,

  enableCreateCalendarEventCheckbox: null,

  reminderBoilerplateTextbox: null,

  /**
   * Initialize the Reply Manager pref pane. Sets up dialog controls
   * to show the categories saved in preferences.
   */
  init: function() {
    this.enableReplyManagerCheckbox =
      document.getElementById("enableReplyManagerCheckbox");
    this.enableCreateCalendarEventCheckbox =
      document.getElementById("toggleReplyManagerCreateEvent");
    this.reminderBoilerplateTextbox =
      document.getElementById("reminderBoilerplateTextbox");
    this.enableElements(this.enableReplyManagerCheckbox.checked);

  },

  toggleReplyManagerEnabled: function() {
    this.enableElements(this.enableReplyManagerCheckbox.checked);
  },

  enableElements: function(aEnabled) {
    this.enableCreateCalendarEventCheckbox.disabled = !aEnabled;
    this.reminderBoilerplateTextbox.disabled = !aEnabled;
  },
};
