/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["replyManagerCalendar"];

const Cu = Components.utils;
const Cc = Components.classes;

Cu.import("resource://gre/modules/errUtils.js");
Cu.import("resource://gre/modules/Services.jsm");

/**
 * replyManagerCalendar
 * Handles interaction with Lightning, the calendar application for Thunderbird
 * To use this module, it is required to have Lightning installed.
 */
var replyManagerCalendar = {
  /* This method is called in replyManagerMailWindowOverlay.js
   * after the window fires the load event. This ensures that 
   * replyManagerCalendar exists. */
  ensureCalendarExists : function ()
  {
    let calName = "replyManagerCalendar";
    this.calendarManager = Cc["@mozilla.org/calendar/manager;1"]
                            .getService(Components.interfaces.calICalendarManager);
    Cu.import("resource://calendar/modules/calUtils.jsm");
    if (this.calendarManager == null) 
      throw new Error("Error: Lightning not found!");
    let calendars = this.calendarManager.getCalendars({});
    let calFound = false;
    /* Filter the calendars so that it only contains replyManagerCalendar
     * if it returns an empty array, this calendar has not been created we
     * need to proceed to creating one.*/
    calendars = calendars.filter(function(cal) cal.name == calName);
    if (calendars.length != 0)
    {
      calFound = true;
      this.calendar = calendars[0];
    }
    //if not found, i.e. the calendar has not been created, create one.
    if (!calFound) 
    {
      let temp = this.calendarManager.createCalendar("storage", Services.io.newURI("moz-profile-calendar://", null, null));
      temp.name = calName;
      this.calendarManager.registerCalendar(temp);
      this.calendar = temp;
    }
  },

  retrieveItem: function(id,calendar)
  {
    let listener = new replyManagerCalendar.calOpListener();    
    calendar.getItem(id, listener);
    return listener.mItems[0];
  },

  /**
   * addEvent
   * @param date is the javascript date object
   * @param id is the messageId field of the message header
   * @param status is a string that will be the title of the event
   */
  addEvent : function(dateStr, id, status)
  {		    
    let iCalString = generateICalString(dateStr);

    // create event Object out of iCalString
    let event = cal.createEvent(iCalString);
    event.icalString = iCalString;
    
    // set Title (Summary) 					  		   
    event.title = status + ": 1 Email";
				
    // set ID
    event.id=id;
    // add Item to Calendar
    this.calendar.addItem(event, null);
  },

  /**
   * modifyCalendarEvent updates the title of the calendar event
   * to the status string
   * @param id uniquely identifies the event to be modified it is
            nsIMsgDBHdr::messageId
   * @param status string is the new event title
   * @param aDateStr(optional) if specified will change the date
   *        of the event.
   */
  modifyCalendarEvent : function(id, status, dateStr)
  {
    let oldEvent = this.retrieveItem(id, this.calendar);
    let iCalString = (dateStr) ? generateICalString(dateStr) :
                                 oldEvent.icalString;

    let newEvent = cal.createEvent(iCalString);
    newEvent.id = id;
    newEvent.calendar = this.calendar;
    newEvent.title = status + ": 1 Email";
    this.calendar.modifyItem(newEvent, oldEvent, null);
  },

  /**
   * removeEvent
   * @param id is nsIMsgDBHdr::messageId field
   */
  removeEvent:function(id)
  {
    try {
      let tempEvent = this.retrieveItem(id, this.calendar);
      this.calendar.deleteItem(tempEvent,null);
    } catch(e) {
      logException(e);
    }	
  },
};

replyManagerCalendar.calOpListener = function () {}
replyManagerCalendar.calOpListener.prototype = {
  mItems: [],
  mDetail: null,
  mId: null,
  mStatus: null,

  onOperationComplete: function(aCalendar, aStatus, aOperationType, aId, aDetail) {
    // stopEventPump();
    this.mDetail = aDetail;
    this.mStatus = aStatus;
    this.mId = aId;
  },

  onGetResult: function(aCalendar, aStatus, aItemType, aDetail, aCount, aItems) {
    // XXX check success(?); dump un-returned data,
    this.mItems = aItems;
  },
}

function generateICalString(aDateStr) {
  // Strategy is to create iCalString and create Event from that string
  let iCalString = "BEGIN:VCALENDAR\n";
  iCalString += "BEGIN:VEVENT\n";
		    
  // generate Date as Ical compatible text string
  iCalString += "DTSTART;VALUE=DATE:" + aDateStr + "\n";	    
		               	   
  // set Duration
  iCalString += "DURATION=PT1D\n";
				   
  // set Alarm
  iCalString += "BEGIN:VALARM\nACTION:DISPLAY\nTRIGGER:-PT" + "1" + "M\nEND:VALARM\n";
		    
  // finalize iCalString
  iCalString += "END:VEVENT\n";
  iCalString += "END:VCALENDAR\n";
  return iCalString;
}
