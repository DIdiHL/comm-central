/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["replyManagerCalendar"];

const Cu = Components.utils;
const Cc = Components.classes;

Cu.import("resource://gre/modules/errUtils.js");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource:///modules/gloda/public.js");
Cu.import("resource:///modules/gloda/index_msg.js");

/**
 * replyManagerCalendar
 * Handles interaction with Lightning, the calendar application for Thunderbird
 * To use this module, it is required to have Lightning installed.
 */
var replyManagerCalendar = {
  /* This method is called in replyManagerMailWindowOverlay.js
   * after the window fires the load event. This ensures that 
   * replyManagerCalendar exists. */
  initCalendar : function ()
  {
    let calendarID = Services.prefs.getCharPref("calendar.replymanager.calendarID");
    /* Get the calendar with the calendarID. If the ID is an empty string,
     * the calendar does not exists. So create one. */
    if (calendarID != "") {
      getCalendarById(calendarID);
    } else {
      createNewCalendar();
    }
    replyManagerCalendarManagerObserver.init();
    replyManagerCalendarObserver.init();
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
    this.calendar.readOnly = false;
    /* First we need to test of an event with the same
     * id exists. If so what we need is modification instead
     * of addition. */
    if (this.retrieveItem(id, this.calendar)) {
      this.modifyCalendarEvent(id, status, dateStr);
      return;
    }
    
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
    this.calendar.readOnly = false;
    /* First we need to test if such event exists, if not we need
     * to create a new event. */
    if (!this.retrieveItem(id, this.calendar)) {
      //No such event, create one
      this.addEvent(dateStr, id, status);
      return;
    }
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
      this.calendar.readOnly = false;
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

/* Get the calendar with the given ID, if such a calendar does not exist,
 * this method will call createNewCalendar. */
function getCalendarById(aCalID) {
  calendarManager = Cc["@mozilla.org/calendar/manager;1"]
                    .getService(Components.interfaces.calICalendarManager);
  let calendar = calendarManager.getCalendarById(aCalID);
  if (calendar != null) {
    replyManagerCalendar.calendar = calendar;
  } else {
    createNewCalendar();
  }
}

/* Create a new reply manager calendar and assign the id of the calendar
 * to the "calendar.replymanager.calendarID" preference. */
function createNewCalendar() {
  let calendarManager = Cc["@mozilla.org/calendar/manager;1"]
                    .getService(Components.interfaces.calICalendarManager);
  let temp = calendarManager.createCalendar("storage", 
              Services.io.newURI("moz-profile-calendar://", null, null));
  temp.name = "ReplyManagerCalendar";
  calendarManager.registerCalendar(temp);
  Services.prefs.setCharPref("calendar.replymanager.calendarID", temp.id);
  replyManagerCalendar.calendar = temp;
}


var replyManagerCalendarManagerObserver = {
  init: function() {
    let calendarManager = Cc["@mozilla.org/calendar/manager;1"]
                    .getService(Components.interfaces.calICalendarManager);
    calendarManager.addObserver(this);
  },

  /* We don't want the calendar to be deleted while the application is
   * running or things will break. So if the user somehow deleted the
   * ReplyManagerCalendar we need to re-create one. */
  onCalendarDeleting: function(aCalendar) {
    if (aCalendar.id == replyManagerCalendar.calendar.id) {
      /* The calendar being deleted is our reply manager calendar we need
       * to create a new one */
      createNewCalendar();
    }
  },
};

var replyManagerCalendarObserver = {
  init: function() {
    replyManagerCalendar.calendar.addObserver(this);
  },
  
  /* query the message using Gloda with the message ID provided. */
  queryMessage: function(aID, aCallback) {
    /* Let's create a Gloda query and search for this message. */
    let query = Gloda.newQuery(Gloda.NOUN_MESSAGE);
    query.headerMessageID(aID);
    let collection = query.getCollection({
      onItemsAdded: function() {},
      onItemsRemoved: function() {},
      onItemsModified: function() {},
      onQueryCompleted: function(aCollection) {
        if (aCollection.items.length > 0) {
          let msgHdr = aCollection.items[0].folderMessage;
          aCallback(msgHdr);
        }
      },
    });
  },
  
  /* It is most likely that when a user delete a reminder he wants to
   * unmark the message as expecting replies, so let's observe such
   * event and do it for the him. */
  onDeleteItem: function(aDeletedItem) {
    let calendar = aDeletedItem.calendar;
    if (calendar == replyManagerCalendar.calendar) {
      let msgID = aDeletedItem.id;
      let callback = function(aMsgHdr) {
        aMsgHdr.setStringProperty("ExpectReply", "false");
        GlodaMsgIndexer._reindexChangedMessages([aMsgHdr], true);
      };
      this.queryMessage(msgID, callback);
    }
  },
  
  /* The user may change the date of a reminder through the calenar interface,
   * we need to observe this and change the property on the message header
   * accordingly */
  onModifyItem: function(aNewItem, aOldItem) {
    /* if the calendar is our ReplyManagerCalendar we know this is the case. */
    let calendar = aOldItem.calendar;
    if (calendar == replyManagerCalendar.calendar) {
      /* Generate a YYYY-MM-DD formated date string */
      let aDateTime = aNewItem.startDate;
      let year = aDateTime.year;
      let month = aDateTime.month + 1;
      let day = aDateTime.day;
      let strMonth = (month < 10) ? "0" + month : month;
      let strDay = (day < 10) ? "0" + day : day;
      let dateStr = "" + year + "-" + strMonth + "-" + strDay;
      
      let msgID = aNewItem.id;
      let callback = function(aMsgHdr) {
        aMsgHdr.setStringProperty("ExpectReplyDate", dateStr);
      };
      this.queryMessage(msgID, callback);
    }
  },
};
