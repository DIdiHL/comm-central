const replyManagerPrefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefBranch).getBranch("replymanager.");
const cceButton = "createCalendarEventButton";
const ccePref = "create_calendar_event_enabled";

function onLoad() {
  let createCalendarEventButton = document.getElementById(cceButton);
  let buttonToggle = replyManagerPrefs.getBoolPref(ccePref);
  let createCalendarEventCmd = document.getElementById("cmd_toggleCreateCalendarEvent");
  try {
    //If this statement doesn't throw an exception, Lightning is installed, we can enable the createCalendarEventButton
    calendarManager = Components.classes["@mozilla.org/calendar/manager;1"].getService(Components.interfaces.calICalendarManager);
    createCalendarEventCmd.removeAttribute("disabled");
    if (buttonToggle)
    {
      createCalendarEventButton.checked = true;
    } else {
      createCalendarEventButton.checked = false;
    }
    window.removeEventListener("load", onLoad);
  } catch (err) {
    createCalendarEventCmd.setAttribute('disabled', 'true');
    replyManagerPrefs.setBoolPref(ccPref, false);
    window.removeEventListener("load", onLoad);
  }
}

function toggleCreateCalendarEvent() {
  let button = document.getElementById(cceButton);
  button.checked = !button.checked;
  replyManagerPrefs.setBoolPref(ccePref, button.checked);
}

window.addEventListener("load", onLoad);