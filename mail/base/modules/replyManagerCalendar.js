/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is
 * Anulya Khare.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Lin Han <hanlin.dev@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
var EXPORTED_SYMBOLS = ["replyManagerCalendar"];
Components.utils.import("resource://gre/modules/errUtils.js");
/**
 * replyManagerCalendar
 * Handles interaction with Lightning, the calendar application for Thunderbird
 * To use this module, it is required to have Lightning installed.
 */
var replyManagerCalendar = {
  initialized: false,

  init : function ()
  {
    if (!this.initialized) {
      let calName = "replyManagerCalendar";
      this.calendarManager = Components.classes["@mozilla.org/calendar/manager;1"].getService(Components.interfaces.calICalendarManager);
      if (this.calendarManager == null) throw "Error: Lightning not found!";
      var calendars = this.calendarManager.getCalendars({});
      let calFound = false;
      for(i=0;i<calendars.length;i++)
      {
        //assumes unique calendar name
        if(calName == calendars[i].name)
        {					
          this.calendar = calendars[i];
          calFound = true;
        }
      }

      //if not found, i.e. the calendar has not been created, create one.
      if (!calFound) {
        var ioSvc = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
        var temp = this.calendarManager.createCalendar("storage",ioSvc.newURI("moz-profile-calendar://", null, null));
        temp.name = calName;
        this.calendarManager.registerCalendar(temp);
        this.calendar = temp;
      }
      this.initialized = true;
    }
  },
		
  dateToStr : function(date)
  {
    //get the year.
    var year = date.getFullYear();
    //get the month.
    var month = date.getMonth()+1;
    month += "";
    if (month.length == 1)
    {
      month = "0"+month;
    }
    //get the date.
    var day = date.getDate();
    day += "";
    if (day.length == 1) 
    {
      day = "0"+day;
    }
    //combine into a string.
    var dateStr = year + "" + month + "" + day;
    return dateStr;
  },
		
  retrieveItem: function(id,calendar)
  {
    if (!this.initialized) throw "Error: calendar not initialized!";
    var listener = new replyManagerCalendar.calOpListener();    
    calendar.getItem(id, listener);
    return listener.mItems[0];
  },
		
  addEvent : function(date, id, status)
  {
    if (!this.initialized) throw "Error: calendar not intialized!";
    var dateStr = this.dateToStr(date);
    let keyLength = 15;
		    
    // Strategy is to create iCalString and create Event from that string
    var iCalString = "BEGIN:VCALENDAR\n";
    iCalString += "BEGIN:VEVENT\n";
    iCalString += "SUMMARY:Test2345\n";	   
		    
    // generate Date as Ical compatible text string
    iCalString += "DTSTART;VALUE=DATE:" + dateStr + "\n";	    
		               	   
    // set Duration
    iCalString += "DURATION=PT1D\n";
				   
    // set Alarm
    iCalString += "BEGIN:VALARM\nACTION:DISPLAY\nTRIGGER:-PT" + "1" + "M\nEND:VALARM\n";
		    
    // finalize iCalString
    iCalString += "END:VEVENT\n";
    iCalString += "END:VCALENDAR\n";

    // create event Object out of iCalString
    var event = Components.classes["@mozilla.org/calendar/event;1"].createInstance(Components.interfaces.calIEvent);	
    event.icalString = iCalString;
    
    // set Title (Summary) 					  		   
    event.title = status + ": 1 Email";
				
    // set ID
    event.id=id;
    //alert(this.calendar);//for debugging
    // add Item to Calendar
    this.calendar.addItem(event, null);
  },
		
  modifyCalendarEvent : function(id, status)
  {
    if (!this.initialized) throw "Error: calendar not initialized!";
    var tempEvent = this.retrieveItem(id, this.calendar);
    var newEvent = Components.classes["@mozilla.org/calendar/event;1"].createInstance(Components.interfaces.calIEvent);
    newEvent.icalString = tempEvent.icalString;
    newEvent.calendar = this.calendar;
    newEvent.title = status + ": 1 Email";
    this.calendar.modifyItem(newEvent, tempEvent, null);
  },
		
  removeEvent:function(id)
  {
    if (!this.initialized) throw "Error: calendar not intialized!";
    try {
      var tempEvent = this.retrieveItem(id, this.calendar);
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
    return;
  },
		    
  onGetResult: function(aCalendar, aStatus, aItemType, aDetail, aCount, aItems) {
    // XXX check success(?); dump un-returned data,
    his.mItems = aItems;
    return;
  },
}