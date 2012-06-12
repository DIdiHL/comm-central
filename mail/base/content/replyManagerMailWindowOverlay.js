/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
Components.utils.import("resource://app/modules/replyManagerUtils.js");
Components.utils.import("resource://app/modules/replyManagerCalendar.js");

const createCalendarEventMenuitem = "createCalendarEventMenuitem";

function onLoad() 
{
  let menuitem = document.getElementById(createCalendarEventMenuitem);
  let createCalendarEventCmd = document.getElementById("cmd_toggleCreateCalendarEvent");
  replyManagerCalendar.ensureCalendarExists();
  try 
  {
    /* If this statement doesn't throw an exception, Lightning is installed, we can enable the createCalendarEvent.
     * The same statement is called within replyManagerCalendar.ensureCalendarExists(). I put that function before the try
     * statement because there maybe unexpected exceptions in that function call which will unnecessarily drive the program
     * flow to the catch block.*/
    calendarManager = Components.classes["@mozilla.org/calendar/manager;1"].getService(Components.interfaces.calICalendarManager);
    createCalendarEventCmd.removeAttribute("disabled");
    /*The checked state of the menuitem is stored in the replyManagerUtils module
     *to let the module know that the user wants to create a calendar event.*/
    replyManagerUtils.createCalendarEventEnabled = menuitem.checked;
    window.removeEventListener("load", onLoad);
  } 
  catch (err) 
  {
    /*An exception was thrown, most probably because Lightning doesn't exist.
     *We are unable to create calendar events so disable the menuitem.*/
    createCalendarEventCmd.setAttribute('disabled', 'true');
    replyManagerUtils.createCalendarEventEnabled = false;
    window.removeEventListener("load", onLoad);
  }
}

function toggleCreateCalendarEvent() 
{
  let menuitem = document.getElementById(createCalendarEventMenuitem);
  replyManagerUtils.createCalendarEventEnabled = menuitem.checked;
}

window.addEventListener("load", onLoad);