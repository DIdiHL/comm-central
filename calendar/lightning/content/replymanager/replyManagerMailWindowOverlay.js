/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
Components.utils.import("resource://calendar/modules/replyManagerUtils.jsm");
Components.utils.import("resource://calendar/modules/replyManagerCalendar.jsm");
Components.utils.import("resource:///modules/gloda/public.js");
Components.utils.import("resource:///modules/mailServices.js");
Components.utils.import("resource:///modules/Services.jsm");

function onLoad() 
{
  let replyManagerMenu = document.getElementById("replyManagerMailContextMenu");
  replyManagerMenu.hidden =
         !Services.prefs.getBoolPref("calendar.replymanager.enabled");
  //initialize the replyManagerCalendar module
  replyManagerCalendar.initCalendar();
  replyManagerMailListener.init();
  replyManagerMailContextPrefObserver.onLoad();
  replyManagerTabOpener.init();
  //If no email is selected the ReplyManager menu should be hidden
  document.getElementById("mailContext").addEventListener("popupshowing",
    function() {
      if (gFolderDisplay.selectedMessage == null) {
        replyManagerMenu.hidden = true;
      } else {
        replyManagerMenu.hidden = false;
      }
    });
  window.addEventListener("unload", function() {
    replyManagerMailContextPrefObserver.onUnload();
  });
}

//--------------------mailContext menu section----------------------------
/* A preference observer that hides/shows the reply manager menu */
var replyManagerMailContextPrefObserver = {
  prefs: null,

  onLoad: function()
  {
    this.prefs = Components.classes["@mozilla.org/preferences-service;1"]
				 .getService(Components.interfaces.nsIPrefService)
				 .getBranch("calendar.replymanager.");
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
      case "enabled":
        document.getElementById("replyManagerMailContextMenu").hidden =
                !Services.prefs.getBoolPref("calendar.replymanager.enabled");
        break;
    }
  }
};

/* startComposeReminder opens the message compose window with some fields filled
 * with some boilerplates.*/
function startComposeReminder() {
  let msgHdr = gFolderDisplay.selectedMessage;
  replyManagerUtils.startReminderComposeForHdr(msgHdr);
}

/* deployMenuitems sets the state of some menuitems in the reply manager popup
 * before the popup shows. */
function onReplyManagerPopupShown() {
  let msgHdr = gFolderDisplay.selectedMessage;
  let expectReplyCheckbox = document.getElementById("expectReplyCheckbox");
  /* Somehow disabling the menuitem directly doesn't work so I disable the
   * associated command instead. */
  let modifyCommand = document.getElementById("cmd_modifyExpectReply");
  if (replyManagerUtils.isHdrExpectReply(msgHdr)) {
    expectReplyCheckbox.setAttribute("checked", "true");
    modifyCommand.setAttribute("disabled", "false");
  } else {
    expectReplyCheckbox.setAttribute("checked", "false");
    modifyCommand.setAttribute("disabled", "true");
  }
  return true;
}

/* toggleExpectReplyCheck box is invoked when the user click the
 * "Expect Reply" checkbox in the menupopup. It will toggle the
 * ExpectReply state of the selected message. */
function toggleExpectReplyCheckbox() {
  let checkbox = document.getElementById("expectReplyCheckbox");
  let menuitem = document.getElementById("modifyExpectReplyItem");
  let msgHdr = gFolderDisplay.selectedMessage;
  /* Since we are going to change the property of the email, we
   * need to reflect this change to the header view pane. Thus
   * hdrViewDeployItems is called in order to make this change.*/
  if (checkbox.getAttribute("checked") == "true") {
    replyManagerUtils.resetExpectReplyForHdr(msgHdr);
    checkbox.setAttribute("checked", "false");
    menuitem.setAttribute("disabled", "true");
    replyManagerHdrViewWidget.hdrViewDeployItems();
  } else if (checkbox.getAttribute("checked") == "false") {
    let params = {
      inMsgHdr: msgHdr,
      outDate: null
    };
    window.openDialog("chrome://lightning/content/replyManagerDateDialog.xul", "replyManagerDateDialog",
                      "chrome, dialog, modal", params);
    if (params.outDate) {
      replyManagerUtils.setExpectReplyForHdr(msgHdr, params.outDate);
      checkbox.setAttribute("checked", "true");
      menuitem.setAttribute("disabled", "false");
      //update the hdr view pane
      replyManagerHdrViewWidget.hdrViewDeployItems();
    }
  }
}

/* modifyExpectReply is called when the user clicks the "Change Deadline" menuitem*/
function modifyExpectReply() {
  let msgHdr = gFolderDisplay.selectedMessage;
  let params = {
    inMsgHdr: msgHdr,
    outDate: null
  }
  window.openDialog("chrome://lightning/content/replyManagerDateDialog.xul", "",
                    "chrome, dialog, modal", params);
  if (params.outDate) {
    replyManagerUtils.updateExpectReplyForHdr(msgHdr, params.outDate);
    //update the hdr view pane
    replyManagerHdrViewWidget.hdrViewDeployItems();
  }
}

/**
 * Listener for new messages and message delete operation.
 * Some emails are associated with calendar events so the
 * the addition and removal of such messages should be
 * watched for so that the calendar event is up to date.
 */
var replyManagerMailListener = {
  // This is used for receiving the "itemAdded" event notification.
  collections: {},
  
  init: function() {
    MailServices.mfn.addListener(this, MailServices.mfn.msgAdded |
                                       MailServices.mfn.msgsDeleted);
  },
  
  checkMessage: function(aGlodaMsg) {
    aGlodaMsg.conversation.getMessagesCollection({
      onItemsAdded: function() {},
      onItemsModified: function() {},
      onItemsRemoved: function() {},
      onQueryCompleted: function(aCollection) {
        for each (let [i, msg] in Iterator(aCollection.items)) {
          if (replyManagerUtils.isHdrExpectReply(msg.folderMessage)) {
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
          replyManagerMailListener.checkMessage(aItems[0]);
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
      let msg = mailEnumerator.getNext()
                              .QueryInterface(Components.interfaces.nsIMsgDBHdr);
      if (replyManagerUtils.isHdrExpectReply(msg)) {
        replyManagerUtils.resetExpectReplyForHdr(msg);
      }
    }
  }
};

var replyManagerTabOpener = {
  strings: null,
  
  init: function() {
    this.strings = new StringBundle("chrome://lightning/locale/replyManager.properties");
  },
  
  openTab: function() {
    let query = Gloda.newQuery(Gloda.NOUN_MESSAGE);
    query.isExpectReply(true);
    let tabTitle = this.strings.getString("replyManagerMailTabTitle");
    let queryCollection = query.getCollection({
      onItemsAdded: function() {},
      onItemsRemoved: function() {},
      onItemsModified: function() {},
      onQueryCompleted: function(aCollection) {
        let tabmail = document.getElementById("tabmail");
        tabmail.openTab("glodaList", {
          collection: queryCollection,
          message: aCollection.items[0],
          title: tabTitle,
          background: false
        });
      },
    });
  },
};

window.addEventListener("load", onLoad);
