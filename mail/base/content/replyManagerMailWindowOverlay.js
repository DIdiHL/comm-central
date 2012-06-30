/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
Components.utils.import("resource:///modules/replyManagerUtils.js");
Components.utils.import("resource:///modules/replyManagerCalendar.js");
Components.utils.import("resource:///modules/gloda/public.js");
Components.utils.import("resource:///modules/mailServices.js");

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
    /* If this statement doesn't throw an exception, Lightning is installed, we can 
     * enable the createCalendarEvent. The same statement is called within 
     * replyManagerCalendar.ensureCalendarExists(). I put that function before the 
     * try statement because there maybe unexpected exceptions in that function call 
     * which will unnecessarily drive the program flow to the catch block.*/
    calendarManager = Components.classes["@mozilla.org/calendar/manager;1"]
                                .getService(Components.interfaces.calICalendarManager);
    createCalendarEventCmd.removeAttribute("disabled");
    /* The checked state of the menuitem is stored in the preference
     * to let the module know that the user wants to create a calendar event.
     * The checked attribute of this element is a string, passing it to setBoolPref as
     * an argument will not change the value of the preference. So I assign this object
     * a boolean property called checked and make the literal meaning of the checked
     * attribute match the boolean property.*/
    menuitem.setAttribute("checked", menuitemToggle);
    replyManagerMailListener.init();
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
  let prefValue = gPrefBranch.getBoolPref("mail.replymanager.create_calendar_event_enabled");
  gPrefBranch.setBoolPref("mail.replymanager.create_calendar_event_enabled", !prefValue);
}

function startComposeReminder() {
  let msgHdr = gFolderDisplay.selectedMessage;
  replyManagerUtils.startReminderComposeForHdr(msgHdr);
}

function deployMenuitems() {
  let msgHdr = gFolderDisplay.selectedMessage;
  let expectReplyCheckbox = document.getElementById("expectReplyCheckbox");
  /* Somehow disabling the menuitem directly doesn't work so I disable the
   * associated command instead. */
  let modifyCommand = document.getElementById("cmd_modifyExpectReply");
  if (msgHdr.isExpectReply) {
    expectReplyCheckbox.setAttribute("checked", "true");
    modifyCommand.setAttribute("disabled", "false");
  } else {
    expectReplyCheckbox.setAttribute("checked", "false");
    modifyCommand.setAttribute("disabled", "true");
  }
  return true;
}

function toggleExpectReplyCheckbox() {
  let checkbox = document.getElementById("expectReplyCheckbox");
  let menuitem = document.getElementById("modifyExpectReplyItem");
  let msgHdr = gFolderDisplay.selectedMessage;
  if (checkbox.getAttribute("checked") == "true") {
    replyManagerUtils.resetExpectReplyForHdr(msgHdr);
    checkbox.setAttribute("checked", "false");
    menuitem.setAttribute("disabled", "true");
  } else if (checkbox.getAttribute("checked") == "false") {
    let params = {
      inMsgHdr: msgHdr,
      outDate: null
    };
    window.openDialog("chrome://messenger/content/replyManagerDateDialog.xul", "",
                      "chrome, dialog, modal", params);
    if (params.outDate) {
      replyManagerUtils.setExpectReplyForHdr(msgHdr, params.outDate);
      checkbox.setAttribute("checked", "true");
      menuitem.setAttribute("disabled", "false");
    }
  }
}

function modifyExpectReply() {
  let msgHdr = gFolderDisplay.selectedMessage;
  let params = {
    inMsgHdr: msgHdr,
    outDate: null
  }
  window.openDialog("chrome://messenger/content/replyManagerDateDialog.xul", "",
                    "chrome, dialog, modal", params);
  if (params.outDate) {
    replyManagerUtils.updateExpectReplyForHdr(msgHdr, params.outDate);
  }
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
        let newPrefValue = gPrefBranch.getBoolPref("mail.replymanager.create_calendar_event_enabled");
        menuitem.setAttribute("checked", newPrefValue)
        break;
    }
  }
};

/**
 * Listener for new messages and message delete operation.
 * Some emails are associated with calendar events so the
 * the addition and removal of such messages should be
 * watched for so that the calendar event is up to date.
 */
//TODO implement the messagesDeleted listener
var replyManagerMailListener = {
  // This is used for receiving the "itemAdded" event notification.
  collections: {},
  
  init: function() {
    MailServices.mfn.addListener(this, MailServices.mfn.msgAdded |
                                       MailServices.mfn.msgsDeleted);
  },
  
  checkNewMessage: function(aGlodaMsg) {
    aGlodaMsg.conversation.getMessagesCollection({
      onItemsAdded: function() {},
      onItemsModified: function() {},
      onItemsRemoved: function() {},
      onQueryCompleted: function(aCollection) {
        for each (let [i, msg] in Iterator(aCollection.items)) {
          if (msg.folderMessage.isExpectReply) {
            // Update the calendar event
            replyManagerUtils.updateExpectReplyForHdr(msg.folderMessage);
          }
        }
        /* We no longer need to watch for this Gloda message so
         * remove the collection for this message from the container.*/
        delete replyManagerMailListener.collections[aGlodaMsg._headerMessageID];
      }
    });
  },
  
  msgAdded: function (aMsgHdr) {
    /* When the message is just added to the DB, the Gloda message is
     * not immediately available so we need to listen for the "itemAdded"
     * event when the message gets indexed.*/
    replyManagerMailListener.collections[aMsgHdr.messageId] =
    Gloda.getMessageCollectionForHeader(aMsgHdr, {
      onItemsAdded: function(aItems, aCollection) {
        if (aItems.length > 0) {
          replyManagerMailListener.checkNewMessage(aItems[0]);
        }
      },
      onItemsModified: function() {},
      onItemsRemoved: function() {},
      onQueryCompleted: function() {}
    });
  },
  
  msgsDeleted: function(aItems) {
    let mailEnumerator = aItems.enumerate();
    while (mailEnumerator.hasMoreElements()) {
      let msg = mailEnumerator.getNext();
      if (msg.isExpectReply) {
        replyManagerUtils.resetExpectReplyForHdr(msg);
      }
    }
  }
};
window.addEventListener("load", onLoad);
window.addEventListener("load", function() {prefObserver.onLoad();}, false);
window.addEventListener("unload", function() {prefObserver.onUnload();}, false);


