/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
Components.utils.import("resource://app/modules/replyManagerUtils.js");
Components.utils.import("resource://app/modules/replyManagerCalendar.js");

const createCalendarEventMenuitem = "createCalendarEventMenuitem";

function onLoad() 
{
  let menuitem = document.getElementById(createCalendarEventMenuitem);
  let menuitemToggle = gPrefBranch.getBoolPref("mail.replymanager.create_calendar_event_enabled");
  let createCalendarEventCmd = document.getElementById("cmd_toggleCreateCalendarEvent");
  try
  {
    //Put this in a try block so that any exception won't affect
    //execution of succeeding code.
    replyManagerCalendar.ensureCalendarExists();
  } catch (err) {}
  
  try 
  {
    /* If this statement doesn't throw an exception, Lightning is installed, we can enable the createCalendarEvent.
     * The same statement is called within replyManagerCalendar.ensureCalendarExists(). I put that function before the try
     * statement because there maybe unexpected exceptions in that function call which will unnecessarily drive the program
     * flow to the catch block.*/
    calendarManager = Components.classes["@mozilla.org/calendar/manager;1"]
                                .getService(Components.interfaces.calICalendarManager);
    createCalendarEventCmd.removeAttribute("disabled");
    /* The checked state of the menuitem is stored in the replyManagerUtils module
     * to let the module know that the user wants to create a calendar event.
     * The checked attribute of this element is a string, passing it to setBoolPref as
     * an argument will not change the value of the preference. So I assign this object
     * a boolean property called checked and make the literal meaning of the checked
     * attribute match the boolean property.*/
    menuitem.checked = menuitemToggle;
    menuitem.setAttribute("checked", menuitem.checked);
  } 
  catch (err) 
  {
    /*An exception was thrown, most probably because Lightning doesn't exist.
     *We are unable to create calendar events so disable the menuitem.*/
    createCalendarEventCmd.setAttribute('disabled', 'true');
    menuitem.setAttribute("checked", "false");
    gPrefBranch.setBoolPref("mail.replymanager.create_calendar_event_enabled", false);
  }
}

function toggleCreateCalendarEvent() 
{
  let menuitem = document.getElementById(createCalendarEventMenuitem);
  //The boolean property is passed to the function instead of the element's attribute
  //The checked attribute of the menuitem is modified in the observer.
  gPrefBranch.setBoolPref("mail.replymanager.create_calendar_event_enabled", !menuitem.checked);
}

var prefObserver = {
  prefs: null,

  onLoad: function()
  {
    this.prefs = Components.classes["@mozilla.org/preferences-service;1"]
				 .getService(Components.interfaces.nsIPrefService)
				 .getBranch("mail.replymanager.");
    this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
    this.prefs.addObserver("", this, false);
  },

  onUnload: function()
  {
    this.prefs.removeObserver("", this);
  },

  observe: function(subject, topic, data)
  {
    if (topic != "nsPref:changed")
    {
      return;
    }

    switch(data)
    {
      /*If the value of this pref is changed in other mail window,
        we need to change the state of the menuitem in this window accordingly.*/
      case "create_calendar_event_enabled":
        let menuitem = document.getElementById(createCalendarEventMenuitem);
        menuitem.checked = prefObserver.prefs.getBoolPref("create_calendar_event_enabled");
        menuitem.setAttribute("checked", menuitem.checked)
        break;
    }
  }
};

window.addEventListener("load", onLoad);
window.addEventListener("load", function() {prefObserver.onLoad();}, false);
window.addEventListener("unload", function() {prefObserver.onUnload();}, false);